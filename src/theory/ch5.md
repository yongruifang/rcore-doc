---
title: 5. Uart接口
icon: hashtag
---
异步串行收发协议
两根数据线实现两个设备之间的全双工通信。
## 数据传输方式
- 将数据在串行和并行之间进行转换。
- Uart数据传输单位为数据包
在传输之前要对数据进行封装操作。
每个数据包:1个起始位，5-9个数据位，1个可选择的奇偶校验位，1-2个停止位

## 波特率
Uart是异步通信协议，双方不是通过时钟同步，而是通过双方实现约定好的波特率来实现同步。
波特，baud，调制速率。
有效数据讯号调制载波的速率。
单位时间内载波调制状态变化的次数。
当使用二进制码元，波特率在数值上等于比特率

一般Uart模块的时钟频率远大于所设定的波特率
需要对时钟分频，获得相等频率。
实现分频可以简单使用一个计数器实现

## 缓冲模块
实现一个缓冲寄存器，暂存需要发送的消息，接收完成等待被读取的数据。

## 发送模块

## 接受模块

## 内存映射
为了让CPU方便访问外设，选择将Uart端口映射到内存地址空间当中，实现通过访存指令访问到Uart端口而不需要专用的IO指令。


