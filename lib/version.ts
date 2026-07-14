import packageJson from '@/package.json';

type PackageJson = {
	version: string;
};

const typedPackageJson = packageJson satisfies PackageJson;

export const MOCKZILLA_VERSION = typedPackageJson.version;
export const MOCKZILLA_VERSION_LABEL = `v${MOCKZILLA_VERSION}`;
