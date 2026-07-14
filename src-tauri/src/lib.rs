use std::{
    net::TcpListener,
    path::PathBuf,
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

struct ServerState {
    child: Mutex<Option<CommandChild>>,
}

fn find_available_port(start: u16) -> Result<u16, String> {
    for port in start..start + 100 {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Ok(port);
        }
    }

    Err("Unable to find an available localhost port".to_string())
}

fn wait_for_health(port: u16) -> Result<(), String> {
    let url = format!("http://127.0.0.1:{port}/api/health");

    for _ in 0..120 {
        if let Ok(response) = ureq::get(&url).timeout(Duration::from_secs(1)).call() {
            if response.status() == 200 {
                return Ok(());
            }
        }

        thread::sleep(Duration::from_millis(500));
    }

    Err(format!("Mockzilla server did not become healthy at {url}"))
}

fn desktop_server_entry(app: &AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("Unable to resolve resource directory: {error}"))?;

    Ok(resource_dir
        .join("desktop-server")
        .join("desktop-server.mjs"))
}

fn desktop_server_bootstrap_args() -> [&'static str; 3] {
    [
        "--input-type=module",
        "--eval",
        "import { pathToFileURL } from 'node:url'; await import(pathToFileURL(process.env.MOCKZILLA_DESKTOP_ENTRY).href);",
    ]
}

fn desktop_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = match std::env::var("MOCKZILLA_DATA_DIR") {
        Ok(path) if !path.trim().is_empty() => PathBuf::from(path),
        _ => app
            .path()
            .app_data_dir()
            .map_err(|error| format!("Unable to resolve app data directory: {error}"))?
            .join("pglite"),
    };

    std::fs::create_dir_all(&data_dir)
        .map_err(|error| format!("Unable to create PGlite data directory: {error}"))?;

    Ok(data_dir)
}

fn start_server(app: &AppHandle, state: Arc<ServerState>) -> Result<u16, String> {
    let port = find_available_port(36666)?;
    let server_entry = desktop_server_entry(app)?;
    let data_dir = desktop_data_dir(app)?;

    let mut command = app
        .shell()
        .sidecar("mockzilla-node")
        .map_err(|error| format!("Unable to create Node sidecar command: {error}"))?;

    command = command
        .args(desktop_server_bootstrap_args())
        .env("HOSTNAME", "127.0.0.1")
        .env("MOCKZILLA_DESKTOP", "1")
        .env(
            "MOCKZILLA_DESKTOP_ENTRY",
            server_entry.to_string_lossy().to_string(),
        )
        .env("MOCKZILLA_DATA_DIR", data_dir.to_string_lossy().to_string())
        .env("DATABASE_URL", "")
        .env("NODE_ENV", "production")
        .env("PORT", port.to_string());

    let (mut rx, child) = command
        .spawn()
        .map_err(|error| format!("Unable to start Mockzilla server sidecar: {error}"))?;

    thread::spawn(move || {
        while let Some(event) = rx.blocking_recv() {
            match event {
                CommandEvent::Stdout(bytes) => {
                    print!("{}", String::from_utf8_lossy(&bytes));
                }
                CommandEvent::Stderr(bytes) => {
                    eprint!("{}", String::from_utf8_lossy(&bytes));
                }
                CommandEvent::Error(error) => {
                    eprintln!("Mockzilla server sidecar error: {error}");
                }
                CommandEvent::Terminated(payload) => {
                    eprintln!(
                        "Mockzilla server sidecar terminated: code={:?}, signal={:?}",
                        payload.code, payload.signal
                    );
                }
                _ => {}
            }
        }
    });

    {
        let mut child_slot = state
            .child
            .lock()
            .map_err(|_| "Unable to lock server state".to_string())?;
        *child_slot = Some(child);
    }

    wait_for_health(port)?;
    Ok(port)
}

fn open_main_window(app: &AppHandle, port: u16) -> Result<(), String> {
    let url = format!("http://127.0.0.1:{port}");
    let window = WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::External(url.parse().map_err(|error| format!("{error}"))?),
    )
    .title("Mockzilla")
    .inner_size(1280.0, 860.0)
    .resizable(true)
    .build()
    .map_err(|error| format!("Unable to open Mockzilla window: {error}"))?;

    window
        .show()
        .map_err(|error| format!("Unable to show Mockzilla window: {error}"))?;

    Ok(())
}

pub fn run() {
    let state = Arc::new(ServerState {
        child: Mutex::new(None),
    });
    let state_for_setup = Arc::clone(&state);
    let state_for_exit = Arc::clone(&state);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let server_port = start_server(&app_handle, Arc::clone(&state_for_setup))?;
            open_main_window(&app_handle, server_port)?;
            Ok(())
        })
        .on_window_event(move |_window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                if let Ok(mut child_slot) = state_for_exit.child.lock() {
                    if let Some(child) = child_slot.take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
