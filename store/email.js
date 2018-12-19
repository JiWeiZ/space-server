var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var transport = nodemailer.createTransport(smtpTransport({
    host:"smtp.qq.com",
    secure:true,
    secureConnection: true,
    port:465,
    auth: {
        user: "2245728257@qq.com",
        pass: "hvmjntggeutodiig"
    }
}));

var sendEmail = function(email,randomNumber){
    var mailOptions = {
        from: "2245728257@qq.com",
        to: email,
        subject: "Space注册验证码",
        // text: "An excellent person like you",
        html: '<!DOCTYPE html>\
        <html lang="zh-CN">\
        <head>\
          <meta charset="UTF-8">\
          <title>validtion code</title>\
        </head>\
        <body>\
          <div style="max-width: 900px; margin: 0 auto;">\
            <header>尊敬的Space用户：</header>\
            <p style="text-indent: 2em;">您好！</p>\
            <p style="text-indent: 2em;line-height: 1.5;">您于' + new Date().toLocaleString() + 'Space官网提交了验证邮箱申请，验证码为：<span>' + randomNumber + '</span>。（在30分钟内有效，30分钟后需要重新提交）</p>\
            <p style="color:#ccc; font-size: 13px;line-height: 1.5;">注：此邮件为Space系统自动发出，请勿直接回复。如非本人操作，请注意安全。</p>\
            <footer style="text-align: right;">\
              <p>space</p>\
            </footer>\
          </div>\
        </body>\
        </html>'
    }
    transport.sendMail(mailOptions,function(err,response){
        if(err){
            console.log(err);
        }else{
            console.log(response);
            transport.close();
        }
    })
}

module.exports = sendEmail;
