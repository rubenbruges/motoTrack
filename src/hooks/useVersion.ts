import packageJson from '../../package.json';

export const useVersion = () => {
  return packageJson.version;
};