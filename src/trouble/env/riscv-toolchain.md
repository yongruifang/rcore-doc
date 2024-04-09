---
title: riscv-toolchain
---

## 安装riscv32-unknown-elf-gcc

```bash
wget https://mirror.iscas.ac.cn/riscv-toolchains/release/riscv-collab/riscv-gnu-toolchain/LatestRelease/riscv32-elf-ubuntu-22.04-gcc-nightly-2023.12.14-nightly.tar.gz
tar -zxvf riscv32-elf-ubuntu-22.04-gcc-nightly-2023.12.14-nightly.tar.gz
sudo mv  ./riscv /opt/riscv 
# 到.bashrc加上 export PATH=/opt/riscv/bin:$PATH  
source ~/.bashrc 
riscv32-unknown-elf-gcc --version # 测试

```

:::tip 如果wget下载到中途，想中断怎么做?
1. <kbd>Ctrl</kbd>+<kbd>Z</kbd> 暂停  
2. `wget -c https://mirror.iscas.ac.cn/riscv-toolchains/release/riscv-collab/riscv-gnu-toolchain/LatestRelease/riscv32-elf-ubuntu-22.04-gcc-nightly-2023.12.14-nightly.tar.gz`  
:::

## 安装特权指令集1.7版本的GNU⼯具链 
在riscv-mini项目中的build-riscv-tools.sh文件。
事实上，这个指令集已经过时。
在riscv-mini的目录下运行脚本
确保设置RISCV变量，和PATH
```bash 
# ./build-riscv-tools.sh
Cloning into 'riscv-tools-priv1.7'...
remote: Enumerating objects: 1225, done.
remote: Total 1225 (delta 0), reused 0 (delta 0), pack-reused 1225
Receiving objects: 100% (1225/1225), 734.90 KiB | 2.02 MiB/s, done.
Resolving deltas: 100% (614/614), done.
Note: switching to '4635ab67966c763a84f7217bc2c20b65dcabc7ec'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -c with the switch command. Example:

  git switch -c <new-branch-name>

Or undo this operation with:

  git switch -

Turn off this advice by setting config variable advice.detachedHead to false

HEAD is now at 4635ab6 Add a "--with-xlen=*" argument to build.sh (#39)
Submodule 'riscv-fesvr' (https://github.com/riscv/riscv-fesvr.git) registered for path 'riscv-fesvr'
Cloning into '/home/fangy/sandbox/riscv-mini/riscv-tools-priv1.7/riscv-fesvr'...
Submodule path 'riscv-fesvr': checked out '0f34d7ad311f78455a674224225f5b3056efba1d'
Submodule 'riscv-gnu-toolchain' (https://github.com/riscv/riscv-gnu-toolchain.git) registered for path 'riscv-gnu-toolchain'
Cloning into '/home/fangy/sandbox/riscv-mini/riscv-tools-priv1.7/riscv-gnu-toolchain'...
Submodule path 'riscv-gnu-toolchain': checked out '728afcddcb0526a0f6560c4032da82805f054d58'
Submodule 'riscv-tests' (https://github.com/riscv/riscv-tests.git) registered for path 'riscv-tests'
Cloning into '/home/fangy/sandbox/riscv-mini/riscv-tools-priv1.7/riscv-tests'...
Submodule path 'riscv-tests': checked out 'c9022d2f63f50388b2ab1192966f30dbe7819a59'
Submodule 'env' (https://github.com/riscv/riscv-test-env.git) registered for path 'riscv-tests/env'
Cloning into '/home/fangy/sandbox/riscv-mini/riscv-tools-priv1.7/riscv-tests/env'...
Submodule path 'riscv-tests/env': checked out '566e47ecd223d4a84fd0b349f525f74f3657dfc7'
Please set the RISCV environment variable to your preferred install path.
```
# 设置环境变量 



## elf2hex的安装
仓库地址: [github.com/sifive/elf2hex](https://github.com/sifive/elf2hex)
安装步骤：
```bash 
git clone https://github.com/sifive/elf2hex.git
cd elf2hex
autoreconf -i
./configure --target=riscv32-unknown-elf
make
make install
# 到~/.bashrc中追加Path 
source ~/.bashrc
```

