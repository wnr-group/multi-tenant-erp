module.exports = ({ config }) => {
  return {
    ...config,
    name: process.env.EXPO_PUBLIC_SCHOOL_NAME ?? config.name,
    slug: process.env.EXPO_PUBLIC_BUNDLE_ID
      ? process.env.EXPO_PUBLIC_BUNDLE_ID.split(".").pop()
      : config.slug,
    android: {
      ...config.android,
      package: process.env.EXPO_PUBLIC_BUNDLE_ID ?? config.android?.package,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.EXPO_PUBLIC_BUNDLE_ID ?? config.ios?.bundleIdentifier,
    },
  };
};
