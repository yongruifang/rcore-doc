---
title: 使用Coursier安装Scala
shortTitle: couriser
icon: circle-down
description: 使用Coursier安装Scala的注意事项
tag: [coursier, scala, chisel, sbt]
---

## Coursier代理设置
### 1.问题描述
- 环境: WSL2
- 系统: Ubuntu22.04
```bash
# [通过Coursier安装Scala](https://www.scala-lang.org/download/)
curl -fL https://github.com/coursier/coursier/releases/latest/download/cs-x86_64-pc-linux.gz | gzip -d > cs && chmod +x cs && ./cs setup
```
运行: `./cs setup`  
报错: `error downloading`
```bash
Checking if a JVM is installed
Found a JVM installed under C:\Program Files\Java\jdk-21.

Checking if ~\AppData\Local\Coursier\data\bin is in PATH
  Should we add ~\AppData\Local\Coursier\data\bin to your PATH? [Y/n] y
Checking if the standard Scala applications are installed
  Found ammonite
Error downloading https://github.com/coursier/coursier/releases/download/v2.1.8/cs-x86_64-pc-linux.gz
```
> By default, coursier <ins>relies on java.net.HttpURLConnection to handle HTTP requests.</ins> java.net.HttpURLConnection automatically picks up proxy related properties. Typically, <ins>https.proxyHost and https.proxyPort need to be set.</ins> If the proxy server requires authentication, https.proxyUser and https.proxyPassword must also be set.  ([来自官方文档](https://get-coursier.io/docs/other-proxy))  
简而言之，Coursier安装过程的代理设置依赖于<b>java.net.HttpURLConnection</b>
### 2.解决方案
- 设置Coursier的代理
[Accept proxy params via Scala CLI conf file](https://github.com/coursier/coursier/pull/2541)  
当下解决方案是通过Scala CLI的配置文件来设置
1. [安装Scala CLI](https://scala-cli.virtuslab.org/install)
2. [使用Scala CLI设置代理](https://scala-cli.virtuslab.org/docs/guides/power/proxy)
```bash
scala-cli --power config httpProxy.address <代理地址>:<代理端口>
# 取消配置
scala-cli --power config httpProxy.address --unset 
```
我的过程
> 我的代理是<ins>https://172.17.16.1:7890</ins>
> 中间断了一次, setup了两次，但总算装好
```bash
(base) fyr@G2:~/.config/nvim$ scala-cli --power config httpProxy.address https://172.17.16.1:7890
(base) fyr@G2:~/.config/nvim$ ./cs setup
Checking if a JVM is installed
Found a JVM installed under /usr/lib/jvm/java-8-openjdk-amd64.

Checking if ~/.local/share/coursier/bin is in PATH

Checking if the standard Scala applications are installed
  Found ammonite
  Installed cs
  Installed coursier
  Installed scala
  Installed scalac
  Installed scala-cli
  Installed sbt
  Installed sbtn
(base) fyr@G2:~/.config/nvim$ scala -version
Scala code runner version 3.3.1 -- Copyright 2002-2023, LAMP/EPFL
(base) fyr@G2:~/.config/nvim$ cs setup --yes
Checking if a JVM is installed
Found a JVM installed under /usr/lib/jvm/java-8-openjdk-amd64.

Checking if ~/.local/share/coursier/bin is in PATH

Checking if the standard Scala applications are installed
  Found ammonite
  Found cs
  Found coursier
  Found scala
  Found scalac
  Found scala-cli
  Found sbt
  Found sbtn
  Installed scalafmt

(base) fyr@G2:~/.config/nvim$ scalafmt -version
scalafmt 3.7.17
```

