#!/bin/sh
#定义command_exists函数，查找系统中是否存在指定的命令
#command -v "$1"查找命令是否存在系统的PATH路径中，存在则返回1否则0；$1是函数的第一个参数（命令名winpty/ls这种）
#>/dev/null 2>&1，丢弃所有输出
#>> 是输出重定向符号,/dev/null是系统黑洞，丢弃所有输出，
command_exists () {
  command -v "$1" >/dev/null 2>&1
}

#command_exists winpty：检查系统是否安装了 winpty（说明这是一个 Windows 环境）。
#test -t 1：检查当前是否是一个交互式终端会话（即用户正在终端中直接执行命令）。
# /dev/tty 是 Linux 中代表当前终端设备的特殊文件。
# 强制将命令的 ** 标准输入（stdin）** 重定向到当前终端设备，确保命令能正确接收用户的键盘输入。
if command_exists winpty && test -t 1; then
  exec < /dev/tty
fi
