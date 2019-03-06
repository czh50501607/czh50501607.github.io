var fBookMark = function () {
    this.oAppendTraget=$('#tragetScroll .list-group');
    this.oMarkNodes = $('.marks>dt');
    this.body = $('body');
    this.iIndexTop = 0;
    this.aClickPostion = [];
    this.init();
};
fBookMark.prototype={
    init() {
        var _this=this
        this.fnScrollAppendChild();
        this.oAppendTraget.children().first().addClass('active');
        this.body.on('scroll', ()=>{_this.eventScroll()});  //监听的滚动
        this.oAppendTraget.children().on('click',(e)=>{_this.eventClick(e)}); //监听点击
    },
    eventScroll(){
        let allTop = this.body.scrollTop(), disableTop = this.body.innerHeight();
        if(this.aClickPostion[this.aClickPostion.length - 1] >= (allTop  + disableTop)) {
            for (let i = 0; i < this.aClickPostion.length; i++) {
                if (this.body.scrollTop() + 55 >= this.aClickPostion[i]) {
                    this.oAppendTraget.children().removeClass('active');
                    this.oAppendTraget.children().eq(i).addClass('active');
                }
            }
        }
    },
    eventClick(e){
        let index=$(e.target).index()
        this.iIndexTop = this.aClickPostion[index]-55;
        this.oAppendTraget.children().removeClass('active');
        $(e.target).addClass('active');
        this.body.scrollTop(this.iIndexTop);
        this.oMarkNodes.eq(index).addClass('tip');
        setTimeout(() => {
            this.oMarkNodes.eq(index).removeClass('tip')
        }, 1000);
    },
   
    fnScrollAppendChild(){
        let str = '';
        this.oMarkNodes.each((index,item)=>{
            this.aClickPostion.push($(item).children().first().offset().top)
            str+=`<li class="list-group-item">${$(item).children().first().html()}</li>`
        })
        this.oAppendTraget.html(str)
    }
}


