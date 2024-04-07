import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    // {
    //   text: "案例",
    //   icon: "laptop-code",
    //   prefix: "demo/",
    //   link: "demo/",
    //   children: "structure",
    // },
    // {
    //   text: "文档",
    //   icon: "book",
    //   prefix: "guide/",
    //   children: "structure",
    // },
    // {
    //   text: "幻灯片",
    //   icon: "person-chalkboard",
    //   link: "https://plugin-md-enhance.vuejs.press/zh/guide/content/revealjs/demo.html",
    // },
    {
      text: "实验",
      icon: "hammer",
      prefix: "experiment/",
      children: "structure",
    },
    {
      text: "新实验",
      icon: "hammer",
      prefix: "newlab/",
      children: "structure",
    },
    {
      text: "理论",
      icon: "flask",
      prefix: "theory/",
      children: "structure",
    },
    {
      text: "参考",
      icon: "book",
      prefix: "reference/",
      children: "structure",
    },
    {
      text: "问题",
      icon: "question",
      prefix: "trouble/",
      children: "structure",
    }
  ],
});
