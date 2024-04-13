---
title: 9. 并行-存储体系实验
icon: sd-card
headerDepth: 3
description: 掌握多核处理器的pthread编程, 统计一个数组中数值"3"的出现次数，数组大小至少256M，初始化为"03030303...", 记录运行时间，使用pthread进行多线程编程，通过加锁解决同步问题，通过私有变量优化性能，尝试消除SMP上的缓存cache ping-pong效应。
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
:::details 参考代码
:::code-tabs #count 
@tab count3.c 
```c 
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define ARRAY_LENGTH 256 * 1024 * 1024
int *array;
int count;
clock_t start, end;
double elapsed;
int count3s() {
  int i;
  count = 0;
  for (i = 0; i < ARRAY_LENGTH; i++) {
    if (array[i] == 3) {
      count++;
    }
  }
  return count;
}
int main() {
  array = (int *)malloc(ARRAY_LENGTH * sizeof(int));
  if (array == NULL) {
    printf("Out of Memory! 内存分配失败\n");
    return 1;
  }
  for (int i = 0; i < ARRAY_LENGTH; i++) {
    array[i] = (i % 2 == 0) ? 0 : 3;
  }
  printf("array build success! size: 0x%x\n", ARRAY_LENGTH);
  printf("hard working...\n");
  // 开始计算 3的个数
  start = clock();
  int count_of_3 = count3s();
  printf("the last count: 0x%x\n", count_of_3);
  end = clock();
  elapsed = (double)(end - start) / CLOCKS_PER_SEC;
  printf("count3 time cost: %f s\n", elapsed);
  // 释放内存
  free(array);
  return 0;
}
```
@tab 运行结果
```bash 
array build success! size: 0x10000000
hard working...
the last count: 0x8000000
count3 time cost: 0.872000 s
```
:::

::: important 要求
数组足够大，至少256M，初始化为“030303…”模式，记录运行时间。
:::

### 2. 多线程(pthread库)
完成主程序设计，将数组array等分为几部分，每个部分由一个线程执行count3s_thread()统计“3”的出现次数——保存在count共享变量中，实现多线程并发统计的功能。

按1、2、4、8、16个线程数量分别执行，记录各自所需的执行时间（绘制成柱状图）。

:::details 查看详细 
**统计结果是否正确？**
加上pthread的互斥锁mutex以解决其错误——每次访问count时先申请mutex，访问结束后释放mutex，从而实现互斥访问保证结果正确； 

按照1、2、4、8、16个线程数量运行，记录各自所需的执行时间。

**效率对比与分析**
比较1）、3）的执行时间（绘制成柱状图），分析原因。将代码进一步改造为先将局部统计值记录在私有变量上，最后再统计总数，样例代码如下：
:::code-tabs #pthread 
@tab a_thread
```c
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define ARRAY_LENGTH 256 * 1024 * 1024
int array[ARRAY_LENGTH];
int count = 0;
int thread_nums[5] = {1, 2, 4, 8, 16};
int t_index = 0;
clock_t start, end;
double elapsed;
void *count3s_thread(void *thread_id) {
  int tid;
  tid = *(int *)thread_id;
  int len_per_thread = ARRAY_LENGTH / thread_nums[t_index];
  int from = tid * len_per_thread;
  int to = from + len_per_thread;
  printf("thread %d, from 0x%x, to 0x%x\n", tid, from, to);
  for (int i = from; i < to; i++) {
    if (array[i] == 3)
      count += 1;
  }
  pthread_exit(NULL);
  return 0;
}
int main() {
  for (int i = 0; i < ARRAY_LENGTH; i++) {
    array[i] = (i % 2 == 0) ? 0 : 3;
  }
  printf("array build success! size: 0x%x\n", ARRAY_LENGTH);
  printf("hard working...\n");
  // σ╝ÇσºïΦ«íτ«ù 3τÜäΣ╕¬µò░
  start = clock();
  int thread_num = thread_nums[t_index];
  pthread_t *threads = (pthread_t *)malloc(thread_num * sizeof(pthread_t));
  for (int i = 0; i < thread_num; i++) {
    int thread_id = i;
    int rc =
        pthread_create(&threads[i], NULL, count3s_thread, (void *)(&thread_id));
    if (rc) {
      printf("Error: return code from pthread_create() is %d\n", rc);
      exit(-1);
    }
  }
  for (int i = 0; i < thread_num; i++) {
    pthread_join(threads[i], NULL);
  }

  printf("the last count: 0x%x\n", count);
  end = clock();
  elapsed = (double)(end - start) / CLOCKS_PER_SEC;
  printf("count3 time cost: %f s\n", elapsed);
  getchar();
  pthread_exit(NULL);
  return 0;
}
```
@tab m_thread
```c 
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define ARRAY_LENGTH 256 * 1024 * 1024
#define TEST 5
int array[ARRAY_LENGTH];
int count = 0;
int thread_nums[TEST] = {1, 2, 4, 8, 16};
int t_index = 0;
clock_t start, end;
double elapsed;
void *count3s_thread(void *thread_id) {
  int tid;
  tid = *(int *)thread_id;
  int len_per_thread = ARRAY_LENGTH / thread_nums[t_index];
  int from = tid * len_per_thread;
  int to = from + len_per_thread;
  for (int i = from; i < to; i++) {
    if (array[i] == 3)
      count += 1;
  }
  pthread_exit(NULL);
  return 0;
}
int main() {
  for (int i = 0; i < ARRAY_LENGTH; i++) {
    array[i] = (i % 2 == 0) ? 0 : 3;
  }
  printf("array build success! size: 0x%x\n", ARRAY_LENGTH);
  printf("hard working...\n");
  for (t_index = 0; t_index < TEST; t_index++) {
    count = 0;
    printf("============%d Threads Result====================\n",
           thread_nums[t_index]);
    start = clock();
    int thread_num = thread_nums[t_index];
    pthread_t *threads = (pthread_t *)malloc(thread_num * sizeof(pthread_t));
    for (int i = 0; i < thread_num; i++) {
      int thread_id = i;
      int rc = pthread_create(&threads[i], NULL, count3s_thread,
                              (void *)(&thread_id));
      if (rc) {
        printf("Error: return code from pthread_create() is %d\n", rc);
        exit(-1);
      }
    }
    for (int i = 0; i < thread_num; i++) {
      pthread_join(threads[i], NULL);
    }
    printf("the last count: 0x%x\n", count);
    end = clock();
    elapsed = (double)(end - start) / CLOCKS_PER_SEC;
    printf("count3 time cost: %f s\n", elapsed);
  }
  getchar();
  pthread_exit(NULL);
  return 0;
}
```
@tab m_with_mutex 
```c 
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define ARRAY_LENGTH 256 * 1024 * 1024
#define TEST 5
int array[ARRAY_LENGTH];
pthread_mutex_t mutex;
int count = 0;
int thread_nums[TEST] = {1, 2, 4, 8, 16};
int t_index = 0;
clock_t start, end;
double elapsed;
void *count3s_thread(void *thread_id) {
  int tid;
  tid = *(int *)thread_id;
  int len_per_thread = ARRAY_LENGTH / thread_nums[t_index];
  int from = tid * len_per_thread;
  int to = from + len_per_thread;
  for (int i = from; i < to; i++) {
    if (array[i] == 3) {
      pthread_mutex_lock(&mutex);
      count += 1;
      pthread_mutex_unlock(&mutex);
    }
  }
  pthread_exit(NULL);
  return 0;
}
int main() {
  for (int i = 0; i < ARRAY_LENGTH; i++) {
    array[i] = (i % 2 == 0) ? 0 : 3;
  }
  printf("array build success! size: 0x%x\n", ARRAY_LENGTH);
  printf("hard working...\n");
  for (t_index = 0; t_index < TEST; t_index++) {
    count = 0;
    printf("============%d Threads Result====================\n",
           thread_nums[t_index]);
    start = clock();
    int thread_num = thread_nums[t_index];
    pthread_t *threads = (pthread_t *)malloc(thread_num * sizeof(pthread_t));
    for (int i = 0; i < thread_num; i++) {
      int thread_id = i;
      int rc = pthread_create(&threads[i], NULL, count3s_thread,
                              (void *)(&thread_id));
      if (rc) {
        printf("Error: return code from pthread_create() is %d\n", rc);
        exit(-1);
      }
    }
    for (int i = 0; i < thread_num; i++) {
      pthread_join(threads[i], NULL);
    }
    printf("the last count: 0x%x\n", count);
    end = clock();
    elapsed = (double)(end - start) / CLOCKS_PER_SEC;
    printf("count3 time cost: %f s\n", elapsed);
  }
  getchar();
  pthread_exit(NULL);
  return 0;
}

```
@tab m_with_mutex_once 
```c 
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#define ARRAY_LENGTH 256 * 1024 * 1024
#define TEST 5
int array[ARRAY_LENGTH];
pthread_mutex_t mutex;
int count = 0;
int thread_nums[TEST] = {1, 2, 4, 8, 16};
int t_index = 0;
/* clock_t start, end; */
struct timespec start, finish;
double elapsed;
void *count3s_thread(void *thread_id) {
  int tid;
  tid = *(int *)thread_id;
  int len_per_thread = ARRAY_LENGTH / thread_nums[t_index];
  int from = tid * len_per_thread;
  int to = from + len_per_thread;
  int local_count = 0;
  for (int i = from; i < to; i++) {
    if (array[i] == 3) {
      local_count++;
    }
  }
  pthread_mutex_lock(&mutex);
  count += local_count;
  pthread_mutex_unlock(&mutex);
  pthread_exit(NULL);
  return 0;
}
int main() {
  for (int i = 0; i < ARRAY_LENGTH; i++) {
    array[i] = (i % 2 == 0) ? 0 : 3;
  }
  printf("array build success! size: 0x%x\n", ARRAY_LENGTH);
  printf("hard working...\n");
  for (t_index = 0; t_index < TEST; t_index++) {
    count = 0;
    printf("============%d Threads Result====================\n",
           thread_nums[t_index]);
    clock_gettime(CLOCK_REALTIME, &start);
    int thread_num = thread_nums[t_index];
    pthread_t *threads = (pthread_t *)malloc(thread_num * sizeof(pthread_t));
    for (int i = 0; i < thread_num; i++) {
      int thread_id = i;
      int rc = pthread_create(&threads[i], NULL, count3s_thread,
                              (void *)(&thread_id));
      if (rc) {
        printf("Error: return code from pthread_create() is %d\n", rc);
        exit(-1);
      }
    }
    for (int i = 0; i < thread_num; i++) {
      pthread_join(threads[i], NULL);
    }
    printf("the last count: 0x%x\n", count);
    clock_gettime(CLOCK_REALTIME, &finish);
    elapsed = (finish.tv_sec - start.tv_sec) +
              1.0e-9 * (finish.tv_nsec - start.tv_nsec);
    printf("count3 time cost: %f s\n", elapsed);
  }
  getchar();
  pthread_exit(NULL);
  return 0;
}
```
:::

> [!WARNING]
> 样例代码计算运行时间使用`clock()`是不准确的，`clock()`不适用于统计多线程程序的运行时间
> clock测量的是处理器的CPU时间，当开启多线程时，使用clock算出的时间可能比实际的时间多一些。
> linux下，应该使用clock_gettime进行计时

### 3. 消除ping-pong效应
参考多核处理器间cache竞争引发的ping-pong效应
>（两个或多个核之间竞争同一个行的数据）

尝试**消除该效应**并检验是否获得**性能提升**。

**记录1、2、4、8、16个线程数目下的各自执行时间**  
与1）的时间相比较（绘制成柱状图）。  
最后形成一个比较理想的SMP并发程序。
