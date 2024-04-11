---
title: 9. 并行-存储体系实验
icon: sd-card
headerDepth: 3
description: 掌握多核处理器的pthread编程
tag: [pthread, SMP]
---
## 目标
- 掌握多核处理器的pthread编程
- 观察SMP上多线程并发程序行为
- 消除SMP上cache ping-pong效应
- 学习cache存储体系
- 学习NUMA内存访存特性

## 内容
- 实现计数器的并行化
- 修正计数器的同步问题
- 修正并发度问题
- 解决ping-pong效应

## 步骤 
### 1. 统计一个数组中数值“3”的出现次数  
::: details 样例代码  
```c
int *array;
int length;
int count;
int count3s()
{
  	int i;
  	count=0;
  	for(i=0;i<length;i++)
  	{
   		if(array[i]==3)
    	{
     		count++;
    	}
  	}
  	return count;
}
```
:::
::: important 要求
数组足够大，至少256M，初始化为“030303…”模式，记录运行时间。
:::

### 2. 多线程(pthread库)
:::details 每个线程执行的统计代码 
```c
int *array; // 待统计的数组
int length; // 每个线程需要统计的个数
int count;  // 统计结果
int t;      // 线程数量

void count3s_thread(int id)
{
    /*compute portion of the array that this thread should work on*/
    int length_per_thread=length/t;
    int start=id*length_per_thread;
   for(i=start;i<start+length_per_thread;i++)
   {
     if(array[i]==3)
       {
        count++;
       }
   }
} 
```
:::

完成主程序设计，将数组array等分为几部分，每个部分由一个线程执行count3s_thread()统计“3”的出现次数——保存在count共享变量中，实现多线程并发统计的功能。按1、2、4、8、16个线程数量分别执行，记录各自所需的执行时间（绘制成柱状图）。


### 3. 统计结果是否正确？
加上pthread的互斥锁mutex以解决其错误——每次访问count时先申请mutex，访问结束后释放mutex，从而实现互斥访问保证结果正确； 

:::details 样例
```c
mutex m;
…..
void count3s_thread(int id)
{
  /*compute portion of the arrray that this thread should work on*/
  int length_per_thread=length/t;
  int start=id*length_per_thread;
  for(i=start;i<start+length_per_thread;i++)
  {
    if(array[i]==3)
     {
       mutex_lock(m);
       		count++;
       mutex_unlock(m);
     }
}
```
:::

按照1、2、4、8、16个线程数量运行，记录各自所需的执行时间。

### 4.效率对比与分析
比较1）、3）的执行时间（绘制成柱状图），分析原因。将代码进一步改造为先将局部统计值记录在私有变量上，最后再统计总数，样例代码如下：
:::details 样例代码
```c
private_count[MaxThreads];
mutex m;
void count3s_thread(int id)
{
  /*compute portion of array for this thread to work on*/
   int length_per_thread=length/t;
   int start=id*length_per_thread;
  for(i=start;i<start+length_per_thread;i++)
  {
    if(array[i]==3)
     {
      private_count[id]++;
     }
  }
       mutex_lock(m);
       count+=private_count[id];
       mutex_unlock(m);
}
```
:::

### 5. 消除ping-pong效应
参考多核处理器间cache竞争引发的ping-pong效应（两个或多个核之间竞争同一个行的数据），尝试消除该效应并检验是否获得性能提升。记录1、2、4、8、16个线程数目下的各自执行时间并与1）的时间相比较（绘制成柱状图）。最后形成一个比较理想的SMP并发程序。
