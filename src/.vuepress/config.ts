import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "RCore",
  description: "vuepress-theme-hope 的文档演示",

  head: [
    ['meta', {name: 'google-site-verification', content: 'lOBM2JrQFkF_NCZ6FoQ4TP9j_OaIkwWZlnDIfgMqL7M'}],
    ['meta', {name: 'baidu-site-verification', content: 'codeva-3OIj4Niri5'}],
    ['meta', {name: 'sogou_site_verification', content: 'hIrYb0JCI5'}],
    ['meta', {name: '360-site-verification', content: '04cd39b694dd9eecd11d5bcda1d3ed44'}],
  ],

  theme,
  // 和 PWA 一起启用
  // shouldPrefetch: false,

});
