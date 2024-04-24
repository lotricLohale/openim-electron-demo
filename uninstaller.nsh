!macro customUnInstall
  # 定义卸载时执行的操作
  # 删除应用数据目录
  RMDir /r $APPDATA\QieQie
  RMDir /r $LOCALAPPDATA\QieQie

  # 如果有需要，可以添加更多的清理命令
!macroend