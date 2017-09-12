var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    setTimeout(function () {
        console.log(oppp);
    }, 1000)
    console.log(ppp)
    res.render('index', {title: 'Express'});
});

module.exports = router;
