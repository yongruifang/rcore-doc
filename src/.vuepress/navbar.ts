import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  // "/demo",
  {
    text: "实验",
    icon: "hammer",
    prefix: "/experiment/",
    children: [
      {
        text: "Lab1. MIPS初识",
        icon: "tag",
        link: "/experiment/lab1",
      },
      {
        text: "Lab2. MIPS乘法器",
        icon: "tag",
        link: "/experiment/lab2",
      },
      {
        text: "Lab3. Chisel写模块",
        icon: "tag",
        link: "/experiment/lab3",
      },
      {
        text: "Lab4. 流水线与冒险",
        icon: "tag",
        link: "/experiment/lab4",
      },
      {
        text: "Lab5. 控制冒险+分支预测",
        icon: "tag",
        link: "/experiment/lab5",
      },

      {
        text: "Lab6. riscv-mini观察",
        icon: "tag",
        link: "/experiment/lab6",
      },

      {
        text: "Lab7. riscv-mini扩展",
        icon: "tag",
        link: "/experiment/lab7",
      },

      {
        text: "Lab8. 处理器结构设计",
        icon: "tag",
        link: "/experiment/lab8",
      },

      {
        text: "Lab9. 并行存储体系实验",
        icon: "tag",
        link: "/experiment/lab9",
      },
    ],
  },
  {
    text: "实验2",
    icon: "hammer",
    prefix: "/newlab/",
    children: [
      {
        text: "Lab1. 单周期",
        icon: "tag",
        link: "/newlab/single",
      },
      {
        text: "Lab2. 流水线",
        icon: "tag",
        link: "/newlab/5-stage",
      },
      ]
  },
  {
    text: "理论",
    icon: "flask",
    prefix: "/theory/",
    children: [
      {
        text: "ch1",
        icon: "hashtag",
        link: "/theory/ch1",
      },
      {
        text: "ch2",
        icon: "hashtag",
        link: "/theory/ch2",
      },
      {
        text: "ch3",
        icon: "hashtag",
        link: "/theory/ch3",
      },
      {
        text: "ch4",
        icon: "hashtag",
        link: "/theory/ch4",
      },
      {
        text: "ch5",
        icon: "hashtag",
        link: "/theory/ch5",
      },
      {
        text: "ch6",
        icon: "hashtag",
        link: "/theory/ch6",
      },
      {
        text: "ch6",
        icon: "hashtag",
        link: "/theory/ch7",
      },
    ],
  },
  {
    text: "参考",
    icon: "book",
    link: "/reference/",
    children: [
      {
        "text": "学习材料",
        "icon": "hashtag",
        "link": "/reference/"
      }
    ]
  },
  {
    text: "常见问题",
    icon: "question",
    link: "/trouble/",
    children: [
      {
        "text": "常见问题",
        "icon": "hashtag",
        "link": "/trouble/",
      }, 
      {
        "text": "安装Scala",
        "icon": "hashtag",
        "link": "/trouble/coursier",
      }, 
      {
        "text": "安装工具链",
        "icon": "hashtag",
        "link": "/trouble/riscv-toolchain",
      }, 
    ]
  },
]);
