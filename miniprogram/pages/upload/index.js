// pages/upload/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },


  initData() {
    wx.cloud.callFunction({
      name: 'data-init',
      data: {
        action: 'init_all'
      },
      success: res => {
        wx.showToast({
          title: '初始化完成'
        })
        console.log(res)
      }
    })
  },
  initCuisines() {
    console.log("开始initCuisines")
    wx.cloud.callFunction({
      name: 'data-init',
      data: {
        action: 'init_cuisines'
      },
      success: res => {
        wx.showToast({
          title: '初始化完成'
        })
        console.log(res)
      }
    })
  },

  loadCuisinesById() {
    console.log("开始")
    wx.cloud.callFunction({
      name: 'cuisine-service',
      data: {
        action: 'getCuisineById',
        id: 'anhui'
      },
      success: res => {
        wx.showToast({
          title: '获取菜系数据成功'
        })
        console.log(res.result.data)
      }
    })
  },

  checkStatus() {
    wx.cloud.callFunction({
      name: 'data-init',
      data: {
        action: 'status'
      },
      success: res => {
        console.log('当前数据：', res)
      }
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})