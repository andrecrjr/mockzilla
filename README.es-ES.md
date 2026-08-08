

<p align="center">
  <img src="public/mockzilla-logo.png" alt="Mockzilla Logo" width="180" />
</p>

<p align="center">
  <a href="https://safeskill.dev/scan/andrecrjr-mockzilla"><img src="https://img.shields.io/badge/SafeSkill-89%2F100_Passes%20with%20Notes-yellow?style=flat-square" alt="SafeSkill Status" /></a>
  <a href="https://hub.docker.com/r/andrecrjr/mockzilla"><img src="https://img.shields.io/docker/pulls/andrecrjr/mockzilla?style=flat-square" alt="Docker Pulls" /></a>
  <a href="https://github.com/andrecrjr/mockzilla/stargazers"><img src="https://img.shields.io/github/stars/andrecrjr/mockzilla?style=flat-square" alt="GitHub Stars" /></a>
  <a href="https://github.com/andrecrjr/mockzilla/blob/main/LICENSE.txt"><img src="https://img.shields.io/github/license/andrecrjr/mockzilla?style=flat-square" alt="License: MIT" /></a>
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Bun-%23000000.svg?style=flat-square&logo=bun&logoColor=white" alt="Bun" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-FFC107?style=flat-square&logo=tauri&logoColor=black" alt="Tauri" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

# Mockzilla

Una potente plataforma de autoalojamiento para simulación de APIs destinada al desarrollo y las pruebas. Implementa tu propio servidor mock privado con una interfaz intuitiva y capacidades avanzadas de generación de respuestas.

## Inicio Rápido

### En memoria con PGLite (Recomendado para Desarrollo)

Inicia al instante con almacenamiento efímero:
```bash
docker run -p 36666:36666 andrecrjr/mockzilla:latest
```

Para mantener los datos persistidos entre reinicios del contenedor:
```bash
docker run -p 36666:36666 -v mockzilla-data:/data andrecrjr/mockzilla:latest
```

### Persistente con PostgreSQL externo (Recomendado para Producción)

Ejecuta con una base de datos externa:
```bash
docker run -p 36666:36666 -e DATABASE_URL=postgresql://username:password@host:5432/database_name andrecrjr/mockzilla:latest
```

El servidor mock y el panel de control estarán disponibles en http://localhost:36666

## Configuración

Se pueden configurar las siguientes variables de entorno:

- `DATABASE_URL` (opcional): Cadena de conexión de PostgreSQL (al usar una base de datos externa)
- `PORT` (opcional): Puerto para ejecutar el servidor (predeterminado: 36666)

## Habilidades para Agentes de IA

Integra a los expertos de IA especializados de Mockzilla en tus flujos de trabajo de agentes:
```bash
npx skills add github.com/andrecrjr/mockzilla
```

Expertos disponibles:
- Mock Maker: Mocks de alta fidelidad utilizando JSON Schema y Faker.
- Workflow Architect: Escenarios con estado y lógica de negocio.
- Spec Translator: Configuración inicial rápida desde especificaciones OpenAPI/técnicas.
- Logic Doctor: Depuración forense y reparación de estado.

## Stack de Autoalojamiento

- Framework: Next.js 16 (App Router)
- Runtime: Bun (motor de JavaScript)
- Base de datos: PostgreSQL con Drizzle ORM
- Estilos: Tailwind CSS 4
- Componentes: Radix UI
- Escritorio: Tauri

## Estructura del Proyecto

```
mockzilla/
├── app/                  # Next.js app directory (mock server UI)
├── components/           # React components (UI elements)
├── lib/                  # Utility functions and configurations
├── drizzle/              # Database migrations
├── public/               # Static assets
├── Dockerfile            # Production container specification
└── docker-compose.yaml   # Development compose file
```

## Cómo Contribuir

Damos la bienvenida a contribuciones para este proyecto de código abierto. Asegúrate de tener Docker y Bun instalados localmente.

### Configuración de Desarrollo

Inicia el entorno de desarrollo con recarga en caliente (hot-reloading):
```bash
make dev-up
```

Genera y aplica migraciones de base de datos:
```bash
make db-generate && make db-migrate
```

Abre la interfaz gráfica de la base de datos (Drizzle Studio):
```bash
make db-studio
```

Ejecuta las verificaciones localmente antes de enviar código:
```bash
bun run lint && bun run typecheck
```

Detén el entorno de desarrollo:
```bash
make dev-down
```

### Proceso de Contribución

1. Realiza un fork del repositorio.
2. Crea tu rama de características: `git checkout -b feature/amazing-feature`.
3. Confirma tus cambios: `git commit -m 'Add some amazing feature'`.
4. Envía los cambios a la rama: `git push origin feature/amazing-feature`.
5. Abre un Pull Request.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.
