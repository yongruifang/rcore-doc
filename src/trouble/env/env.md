---
title: 使用Coursier安装Scala
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
scala-cli --power config httpProxy.address http://proxy.company.com:8081
```
我的过程
```bash
 .\cs setup
Checking if a JVM is installed
Found a JVM installed under C:\Program Files\Java\jdk-21.

Checking if ~\AppData\Local\Coursier\data\bin is in PATH

Checking if the standard Scala applications are installed
  Found ammonite
Error downloading https://github.com/coursier/coursier/releases/download/v2.1.8/cs-x86_64-pc-win32.zip
 scala-cli --power config httpProxy.address http://127.0.0.1:7890
 .\cs setup
Checking if a JVM is installed
Found a JVM installed under C:\Program Files\Java\jdk-21.

Checking if ~\AppData\Local\Coursier\data\bin is in PATH

Checking if the standard Scala applications are installed
  Found ammonite
 scala-cli --power config httpProxy.address https://127.0.0.1:7890
 .\cs setup
Checking if a JVM is installed
Found a JVM installed under C:\Program Files\Java\jdk-21.

Checking if ~\AppData\Local\Coursier\data\bin is in PATH

Checking if the standard Scala applications are installed
  Found ammonite
  Installed cs
  Installed coursier
  Installed scala
  Installed scalac
  Installed scala-cli
  Installed sbt
  Installed sbtn
```

