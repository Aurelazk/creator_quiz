'use strict';

const QUESTIONS = require('../server/questions.json');

module.exports = (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    ok: true,
    mode: 'serverless',
    questions: QUESTIONS.length,
  }));
};
