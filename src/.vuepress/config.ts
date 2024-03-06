import { defineUserConfig } from "vuepress";
// import theme from "./theme.js";
import {hopeTheme} from 'vuepress-theme-hope';

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "RCore",
  description: "vuepress-theme-hope 的文档演示",

  //theme,
  theme: hopeTheme({
    plugins: {
      mdEnhance: {
        tasklist: true,
      }
    }
  })

  // 和 PWA 一起启用
  // shouldPrefetch: false,

});
