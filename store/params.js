exports.emailRegex = /^[a-zA-Z0-9]{1}\w{4,11}\@\w{2,10}\.\w{1,5}$/
exports.phoneRegex = /^((13[0-9])|(14[5,7,9])|(15[^4])|(18[0-9])|(17[0,1,3,5,6,7,8]))\d{8}$/
exports.userNameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]{3,12}$/
exports.passwordRegex = /(?!^\\d+$)(?!^[a-zA-Z]+$)(?!^[!@#$%^&*()-_=+,.?~·]+$).{6,}/
exports.defaultPortrait = 'http://ph7k01x84.bkt.clouddn.com/FgN6qwQbyVOF5EvzlfPleIGmjhki'
exports.imgRegex = /\!\[\w*]\((.+)\)/
