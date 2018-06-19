/* *
 * 算术表达式 文本编辑器
 * author: ChenFeng
 * version: 1.0.0 2018-6-4
 * 视图->数据，通过触发自定义input事件的方式
 * 数据->视图，通过常规渲染dom
 */
function ExprEditer (opt) {
	var _opt = opt;
	// base property
	this.tags = typeof _opt.tags == 'function'? _opt.tags() : _opt.tags;
	this.editDom = document.querySelector(_opt.editArea);
	this.tagsDom = document.querySelector(_opt.tagsArea);
	this.infoDom = document.querySelector(_opt.infoArea);
	this.prefix = _opt.prefix || ExprEditerCONT.PREFIX;
	this.suffix = _opt.suffix || ExprEditerCONT.SUFFIX;
	this.onIllegalChar = typeof _opt.onIllegalChar == 'function'? _opt.onIllegalChar : null;
	this.onBadExpr = typeof _opt.onBadExpr == 'function'? _opt.onBadExpr : null;
	this.onInput = typeof _opt.onInput == 'function'? _opt.onInput : null;
	// compute property
	this.exprCode = null;
	this.exprText = null;
	// this.exprHtml = null;
	// init method
	this.init();
}

// public:
/* 初始化 */
ExprEditer.prototype.init = function() {
	var _t = this;
	_t.editDom.setAttribute('contentEditable', true);
	// 绑定自定义事件'expr.input'
	ExprEditerUtil.bindEvent(_t.editDom, ExprEditerCONT.E.INPUT, function () {
		// 编辑区html解析成text
		_t._parseEditerView();
		// 解析结果渲染在信息区
		if (_t.onInput)
			_t.onInput(_t.exprCode, _t.exprText);
		// 实时校验
		_t._checkExprOnTime();
	});
	// 键盘按键抬起时
	ExprEditerUtil.bindEvent(_t.editDom, 'keyup', function () {
		// 触发自定义事件'expr.input'
		ExprEditerUtil.triggerEvent(_t.editDom, ExprEditerCONT.E.INPUT, false, false);
	});

	// render tags
	_t.setTags(_t.tags);
};
/* 设置标签数据
 * @param 标签数据
 */
ExprEditer.prototype.setTags = function(tArr) {
	/* 数据与视图 同时更新 */
	this.tags = tArr || [];
	var tagsDom = this.tagsDom;
	tagsDom.innerHTML = '';
	for (var i = 0; i < tArr.length; i++) {
		var tn = this._getTagDom(tArr[i].value, tArr[i].text);
		this._bindEventForTag(tn);
		tagsDom.appendChild(tn);
	}
};
/* 将标签渲染至编辑区光标处 
 * @param 编辑区节点
 * @param 代码
 * @param 文本
 */
ExprEditer.prototype.randerTagToSelection = function (target, val, text){
	target.focus();
	var userSelection = ExprEditerUtil.getUserSelection();
	
	var range = ExprEditerUtil.getRangeObject(userSelection);
	var eTag = this._getETagDom(val, text);
	this._bindEventForETag(eTag);
	// 空格 文本节点
	var spanNode = document.createTextNode(' ');
	range.insertNode(spanNode);
	range.insertNode(eTag);// 在光标位置插入该对象
	// range.insertNode(spanNode);
	target.focus(); // 最后强行聚焦╭(╯^╰)╮
};
/* 获取表达式的代码
 * @param 替换项代码前缀
 * @param 替换项代码后缀
 */
ExprEditer.prototype.getExprCode = function() {
	return this.exprCode;
};
/* 获取表达式文本 */
ExprEditer.prototype.getExprText = function() {
	return this.exprText;
};
/* 清空表达式 */
ExprEditer.prototype.editEmpty = function() {
	this.editDom.innerHTML = '';
	this.editDom.focus();
	// 触发自定义事件'expr.input'
	ExprEditerUtil.triggerEvent(this.editDom, ExprEditerCONT.E.INPUT, false, false);
};
/* 设置编辑区内容，根据表达式代码 */
ExprEditer.prototype.setEditerView = function(code) {
	var _t = this;
	if (!code || !_t.tags || _t.tags.length == 0) 
		return;
	_t.exprCode = code;
	var tagsMap = {}; // {value: text}
	for (var i = 0; i < _t.tags.length; i++)
		tagsMap[_t.tags[i].value] = _t.tags[i].text;
	var matchCodes = code.match(new RegExp(_t.prefix+'[a-zA-z0-9]+'+_t.suffix, 'g'));
	var matchTextHtmls = matchCodes.map(function (mc) {
		mc = mc.replace(_t.prefix, '').replace(_t.suffix, '');
		var text = tagsMap[mc];
		return _t._getETagDom(mc, text).outerHTML;
	});
	var exprHtml = code;
	for (var j = 0; j < matchCodes.length; j++)
		exprHtml = exprHtml.replace(matchCodes[j], matchTextHtmls[j]);
	_t.editDom.innerHTML = exprHtml;
	_t._bindEventForAllETag(); // 绑定事件
	/* 待优化，可改成触发input事件... */
	_t.exprText = ExprEditerUtil.html2text(exprHtml);
	// 相当于触发input事件
	if (_t.onInput)
		_t.onInput(this.exprCode, this.exprText);
	// 实时校验
	_t._checkExprOnTime();
};

// private:
ExprEditer.prototype._getTagDom = function(value, text) {
	var tn = document.createElement("button");
	tn.setAttribute('data-value', value);
	tn.innerText = text;
	tn.style = 'margin: 5px; display: inline-block;';
	return tn;
};
ExprEditer.prototype._getETagDom = function(value, text) {
	var eTag = document.createElement("span");//创建节点对象
	eTag.setAttribute('contentEditable', false);
	eTag.setAttribute('title', '点击删除');
	eTag.setAttribute('data-value', value);
	eTag.setAttribute('data-role', ExprEditerCONT.ROLE.ETAG);
	eTag.innerText = text;
	eTag.style = 'margin: 2px; padding: 2px; display: inline-block; background-color: #E7F7FC; cursor: pointer; color: #2486ff;';
	return eTag;
};
ExprEditer.prototype._bindEventForTag = function(tagNode) {
	var _t = this;
	ExprEditerUtil.bindEvent(tagNode, 'click', function () {
		// 点击则渲染进编辑区
		var val = tagNode.getAttribute('data-value');
		var text = tagNode.innerText;
		_t.randerTagToSelection(_t.editDom, val, text);
		// 触发编辑区输入事件
		ExprEditerUtil.triggerEvent(_t.editDom, ExprEditerCONT.E.INPUT, false, false);
	});
};
ExprEditer.prototype._bindEventForETag = function(eTagNode) {
	var _t = this;
	ExprEditerUtil.bindEvent(eTagNode, 'click', function () {
		// 点击则删除自己
		eTagNode.parentNode.removeChild(eTagNode);
		// 触发编辑区输入事件
		ExprEditerUtil.triggerEvent(_t.editDom, ExprEditerCONT.E.INPUT, false, false);
	});
};
ExprEditer.prototype._bindEventForAllETag = function() {
	var etags = this.editDom.getElementsByTagName('span');
	for (var i = 0; i < etags.length; i++) 
		if (etags[i].getAttribute('data-role') == ExprEditerCONT.ROLE.ETAG)
			this._bindEventForETag(etags[i]);
};
ExprEditer.prototype._parseEditerView = function () {
	var pre = this.prefix;
	var suf = this.suffix;
	var eh = this.editDom.innerHTML;
	var temp = document.createElement('div');
	temp.innerHTML = eh;
	var tags = temp.getElementsByTagName('span');
	for (var i = 0; i < tags.length; i++)
		tags[i].innerText = pre + tags[i].getAttribute('data-value') + suf;
	var code = temp.innerText.replace(/\s/g, '');
	this.exprCode = code;
	this.exprText = this.editDom.innerText.replace(/\s/g, '');
};
ExprEditer.prototype._checkExprOnTime = function() {
	var code = this.exprCode;
	if (!code) return;
	// 把标签代码替换成一个数，为啥是2？感觉比较好算吧 |ω•`)
	// 为啥2用括号括起来？为了当数字紧挨代码的时候让计算机认为它是错的表达式，比如123{{xx}}
	code = code.replace(new RegExp(this.prefix+'[a-zA-z0-9]+'+this.suffix, 'g'), '(2)');
	if (code.search(/[\u4e00-\u9fa5a-zA-z\~\!\@\#\$\^\&\_\'\"\！\￥\……\（\）\—\“\”\《\》\？\,]/) != -1) {
		this.onIllegalChar(this.exprCode, this.exprText);
		return;
	}
	var res = null;
	try {
		res = eval(code); // 利用eval校验表达式是否正确，IDE报错请忽略
		if (res == null || typeof res !== 'number') {
			this.onBadExpr(this.exprCode, this.exprText);
		}
	} catch (e) {
		this.onBadExpr(this.exprCode, this.exprText);
	}
	// TODO
	// console.log(res);
};

/* static method: */
var ExprEditerUtil = {
	// 获取Selection对象
	getUserSelection: function () {
		if (window.getSelection) //现代浏览器
			return window.getSelection();
		else if (document.selection) //IE浏览器 考虑到Opera，应该放在后面
			return document.selection.createRange();
	},
	// 获取Range对象
	getRangeObject: function (selectionObject) {
	    if (selectionObject.getRangeAt)
	        return selectionObject.getRangeAt(0);
	    else { // 较老版本Safari!
	        var range = document.createRange();
	        range.setStart(selectionObject.anchorNode,selectionObject.anchorOffset);
	        range.setEnd(selectionObject.focusNode,selectionObject.focusOffset);
	        return range;
    	}
	},
	// 绑定事件
	bindEvent: function(dom, type, fn, capture) {		
	    if (window.addEventListener)
	        dom.addEventListener(type, fn, capture);
	    else if (window.attachEvent)
	        dom.attachEvent("on" + type, fn);
	    return this;
	},
	// 触发事件
	triggerEvent: function (dom, type, canBubble, preventDefault) {
		var evt = document.createEvent("HTMLEvents");
		evt.initEvent(type, canBubble, preventDefault);
		dom.dispatchEvent(evt);
	},
	html2text: function (html) {
		var de = document.createElement('div');
		de.innerHTML = html;
		return de.innerText;
	}
	
};
// 常量
var ExprEditerCONT = {
	PREFIX: '{{', // 默认前缀
	SUFFIX: '}}',  // 默认后缀
	ROLE: {
		ETAG: 'etag'
	},
	E: {
		INPUT: 'expr.input',
		ILLEGAL_CHAR: 'expr.illegal_char',
		BAD_EXPR: 'expr.bad_expr'
	}
};