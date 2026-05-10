import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/index.ts");
Config.setPublicDir("./public");
Config.setConcurrency(8);
Config.setVideoImageFormat("png");
