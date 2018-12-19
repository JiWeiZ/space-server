const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt-nodejs')

const Users = require('../models/Users')
const ValidateCode = require('../models/ValidateCodes')
const sendEmail = require('../store/email')
const { genRandomNumber, promisify, maxObj } = require('../store/utils')
const { emailRegex, userNameRegex, passwordRegex } = require('../store/params')

router.post('/checkUserName', async function (req, res) {
  const { userName } = req.body
  // 检查用户名
  if (userNameRegex.test(userName)) {
    user = await Users.findOne({userName})
    if (user) {
      return res.json({
        ok: false,
        msg: '用户名已注册'
      })
    } else {
      return res.json({
        ok: true,
        msg: '用户名可用'
      })
    }
  } else {
    return res.json({
      ok: false,
      msg: '用户名不合法'
    })
  }  

})

router.post('/checkEmailRegex', async function (req, res) {
  let email = req.body.email
  // 验证邮箱正则
  if (!emailRegex.test(email)) {
    return res.json({
      ok: false,
      msg: '邮箱格式不正确'
    })
  } else {
    return res.json({
      ok: true,
      msg: ''
    })
  }
})

router.post('/checkEmail', async function (req, res) {
  let email = req.body.email
  // 验证邮箱正则
  if (!emailRegex.test(email)) {
    return res.json({
      ok: false,
      msg: '邮箱格式不正确'
    })
  } else {
    // 验证邮箱重复性
    const emailArr = email.split('@')
    email = emailArr[0] + `@` + emailArr[1].toLowerCase()
    const user = await Users.findOne({email})
    if (user) {
      return res.json({
        ok: false,
        msg: '邮箱已注册'
      })
    } else {
      return res.json({
        ok: true,
        msg: ''
      })
    }
  }
})

router.post('/checkValidateCode', async function (req, res) {
    const {email, validatecode} = req.body
    // 检查验证码
    validatecodes = await ValidateCode.find({email})
    if (validatecodes.length === 0) {
      return res.json({
        ok: false,
        msg: '未发送验证码或验证码已过期'
      })
    } else {
      const validatecodeDB = maxObj(validatecodes, 'addTime').code
      if (validatecode !== validatecodeDB) {
        return res.json({
          ok: false,
          msg: '验证码不正确或已过期'
        })
      } else {
        return res.json({
          ok: true,
          msg: ''
        })
      }  
    }
})

router.post('/getValidateCode', async function (req, res) {
  let email = req.body.email
  // 验证邮箱正则
  if (!emailRegex.test(email)) {
    return res.json({
      ok: false,
      msg: '邮箱格式不正确'
    })
  } 
  // 生成6位验证码
  const randomNumber = genRandomNumber(6)
  let validatecode = new ValidateCode({email, code: randomNumber})
  // 保存验证码
  await validatecode.save()
  // 发送验证码
  await sendEmail(email, randomNumber)
  res.status(201).json({
    msg: '验证码已发送'
  })
  // 验证码有效期10分钟
  await setTimeout(() => { validatecode.remove() }, 1000 * 60 * 10)
})

router.post('/submitRegister', async function (req, res) {
  let { userName, password, email, validatecode } = req.body

  // 检查邮箱
  if (emailRegex.test(email)) {
    // 检查邮箱是否注册
    const emailArr = email.split('@')
    email = emailArr[0] + `@` + emailArr[1].toLowerCase()
    let user = await Users.findOne({email})
    if (user) {
      return res.status(403).json({
        msg: '邮箱已注册'
      })
    } 
  } else {
    return res.status(403).json({
      msg: '邮箱格式不正确'
    })
  }

  // 检查验证码
  validatecodes = await ValidateCode.find({email})
  if (validatecodes.length === 0) {
    return res.status(403).json({
      msg: '未发送验证码或验证码已过期'
    })
  }
  const validatecodeDB = maxObj(validatecodes, 'addTime').code
  if (validatecode !== validatecodeDB) {
    return res.status(403).json({
      ok: false,
      msg: '验证码不正确或已过期'
    })
  }

  // 检查用户名
  if (userNameRegex.test(userName)) {
    user = await Users.findOne({userName})
    if (user) {
      return res.status(403).json({
        ok: false,
        msg: '用户名已注册'
      })
    }
  } else {
    return res.status(403).json({
      ok: false,
      msg: '用户名不合法'
    })
  }

  // 检查用户密码
  if (passwordRegex.test(password)) {
    // 保存用户信息
    const saltRounds = 10
    // bcrypt-nodejs 默认使用回调，需要将其包装成promise
    const salt = await promisify(bcrypt.genSalt)(saltRounds)
    const passwordHashed = await promisify(bcrypt.hash)(password, salt, null)
    let newUser = new Users({ userName, password: passwordHashed, email})
    await newUser.save()
    await res.status(201).json({
      ok: true,
      data: {
        message: 'user has been created',
        userInfo: {
          userName,
          email,
          addTime: newUser.addTime
        }
      }
    })
  } else {
    return res.status(403).json({
      ok: false,
      msg: '密码不能是纯数字、字母和符号，最少6位'
    })
  }
})

router.post('/submitLogin', async function (req, res) {
  const { userName, password } = req.body
  try {
    const user = await Users.findOne({$or: [
      {userName},
      {email: userName}
    ]}).exec()
    const passwordHashed = user.password
    const isMatch = await promisify(bcrypt.compare)(password, passwordHashed)
    if (isMatch) {
      if (!req.session.user) {
        req.session.user = user
      } 
      res.status(200).json({
        ok: true,
        msg: 'matched',
        data: {
          user: {
            _id:user._id,
            userName: user.userName,
            email: user.email,
            portrait: user.portrait,
            briefIntro: user.briefIntro
          }
        }
      })
    } else {
      res.status(403).json({
        ok: false,
        msg: '用户不存在或密码错误'
      })
    }
  } catch (e) {
    res.status(403).json({
      msg: '用户不存在或密码错误'
    })
  }
})

router.post('/submitPwdChange', async function (req, res) {
  let { password, email, validatecode } = req.body

  // 检查邮箱
  if (emailRegex.test(email)) {
    // 检查邮箱是否注册
    const emailArr = email.split('@')
    email = emailArr[0] + `@` + emailArr[1].toLowerCase()
    let user = await Users.findOne({email})
    if (!user) {
      return res.status(403).json({
        msg: '邮箱未注册'
      })
    } 
  } else {
    return res.status(403).json({
      msg: '邮箱格式不正确'
    })
  }

  // 检查验证码
  validatecodes = await ValidateCode.find({email})
  if (validatecodes.length === 0) {
    return res.status(403).json({
      msg: '未发送验证码或验证码已过期'
    })
  }
  const validatecodeDB = maxObj(validatecodes, 'addTime').code
  if (validatecode !== validatecodeDB) {
    return res.status(403).json({
      ok: false,
      msg: '验证码不正确或已过期'
    })
  }

  // 检查用户密码
  if (passwordRegex.test(password)) {
    // 保存用户信息
    const saltRounds = 10
    // bcrypt-nodejs 默认使用回调，需要将其包装成promise
    const salt = await promisify(bcrypt.genSalt)(saltRounds)
    const passwordHashed = await promisify(bcrypt.hash)(password, salt, null)
    let user = await Users.findOne({email})
    await user.updateOne({password: passwordHashed})
    await res.status(201).json({
      ok: true,
      msg: ''
    })
  } else {
    return res.status(403).json({
      ok: false,
      msg: '密码不能是纯数字、字母和符号，最少6位'
    })
  }
})

router.post('/checkLogin', async function (req, res) {
  if (req.session.user) {
    let user = await Users.findById(req.session.user._id)
    return res.json({
      msg: true,
      data: {
        user: {
          _id:user._id,
          userName: user.userName,
          email: user.email,
          portrait: user.portrait,
          briefIntro: user.briefIntro
        }
      }
    })
  } else {
    return res.json({msg: false})
  }
})

router.post('/logout', function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      res.status(500).json({
        msg: false,
        data: '退出登陆失败'
      })
    }
    res.clearCookie('sessionId')
    res.json({
      msg: true,
      data: '退出登陆成功'
    })
  })
})

router.post('/changeInfo', async function (req, res) {
  let { portrait, briefIntro, userName } = req.body
  let changed = false
  if (req.session.user) {
    let user = await Users.findById(req.session.user._id)
    if (portrait && portrait !== user.portrait) {
      await user.updateOne({portrait})
      changed = true
    }
    if (briefIntro && briefIntro !== user.briefIntro) {
      await user.updateOne({briefIntro})
      changed = true
    }
    if (userName && userName !== user.userName ) {
      // 检查用户名
      if (userNameRegex.test(userName)) {
        let userStored = await Users.findOne({userName})
        if (userStored) {
          return res.status(403).json({
            ok: false,
            msg: '用户名已注册'
          })
        }
      } else {
        return res.status(403).json({
          ok: false,
          msg: '用户名不合法'
        })
      }
      await user.updateOne({userName})
      changed = true
    }
    if (changed) {
      return res.json({
        ok: true,
        msg: '修改成功'
      })
    } else {
      return res.json({
        ok: false,
        msg: '未作改动'
      })
    }
  } else {
    return res.json({
      ok: false,
      msg: '用户不存在'
    })
  }
})

router.get('/test', function (req, res) {
  return res.json({
    msg: 'hello'
  })
})

module.exports = router;
