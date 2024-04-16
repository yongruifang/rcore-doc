import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "RCore",
  description: "vuepress-theme-hope 的文档演示",

  head: [
    ['meta', {name: 'google-site-verification', content: 'lOBM2JrQFkF_NCZ6FoQ4TP9j_OaIkwWZlnDIfgMqL7M'}]
  ],

  theme,
  // 和 PWA 一起启用
  // shouldPrefetch: false,

});
