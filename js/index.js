/* 入口頁：重置示範資料按鈕 */
document.getElementById('reset').onclick = function () {
  UI.confirmBox('重置示範資料', '將清除所有操作並還原初始示範資料。', '確定重置', function () { Core.reset(); UI.toast('已重置', 'ok'); }, true);
};
