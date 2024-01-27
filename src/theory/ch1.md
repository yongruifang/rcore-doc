---
title: 1. Scala的基础语法
icon: hashtag
---
目的: 了解使用Chisel所需要的基础知识

## 1. 变量var和val
var可变，val不可变。<b>Scala追求不变性，基本上使用val。</b>
尤其是用Chisel定义的电路硬件，均作为val处理。
## 2. 集合: Seq
集合被定义成类似数组的对象，Seq是典型的集合。
```scala
val a = Seq(1,2,3)
a(0) // print 1
a(1) // print 2
a(2) // print 3
```
- Seq是一个<b>有序的</b>集合
- 索引从0开始
> 介绍一个特殊的方法: tabulate
### 2.1 tabulate()
- param1: 元素个数
- param2: 指定函数
- 返回: 从0开始的连续整数通过函数的结果
```scala
// 对0-4分别做平方运算，输出List(0,1,4,9,16)
val b = Seq.tabulate(5)(n=>n*n)
```
## 3. for表达式
```scala
for(i <- 0 to 5) println(i)
```
<b>Scala中的for不是语句，而是表达式。</b>这属于Scala的函数式语言特征，for表达式定义为返回特定值的表达式，可以与其他表达式相结合。
## 4. 对象
### 4.1 类class
- 定义 class
- 实例化 new
- 继承 extends
### 4.2 特质trait
- 背景: 类不允许多重继承，但是我们通常需要在一个类中实现分割的多个功能模块。
```scala
trait 油门 {...}
trait 脚刹 {...}
class 车 extends 油门 with 脚刹 {...}
```
- trait用于在类之间共享字段和方法
- 类似Java接口，但==trait可以有实现体==
- trait<b>不能单独实例化</b>
- 利用trait可以实现多重继承，<b>第二个之后的用with连接</b>
    - 当多个trait出现字段或方法重复时，<ins>Scala优先继承右侧trait</ins>
### 4.3 单例对象
- 背景: Scala中没有static关键字。
    - 在Java中，static关键字定义在应用程序中只存在一次的字段和方法
    - 在Scala中，<ins>使用单例对象来替代</ins>
    - 单例对象常用作含工厂方法的伴生对象(例子如下)
    - <ins>伴生对象可以访问对应类的私有成员</ins>
```scala
class Example (a: Int) {
    val hoge = a
}
object Example{
    def apply(a: Int) {
        new Example(a)
    }
}
# 使用工厂方法生成实例
val x = Example.apply(1)
# apply是Scala的特殊函数，可以省略这个函数名
# val x = Example(1) 起到同样效果

# 构造器如果私有化
class Example private (a: Int) {
    val hoge = a
}
val x = new Example(1) // error will occur
val x = Example.apply(1) // pass
```
> 一切都是对象
> > 实际上，+ - 等运算符被定义为Int类的方法  
> > 1 + 1 如果不简写，就是 1.+(1)  
> > for表达式出现的to也是Int类的方法  
> > 0 to 5 返回表示范围的Range类的实例

### 4.4 样例类
`case class`：默认定义了工厂方法apply

## 5 命名空间
- 定义: 包 package
- 访问: 导入 import
