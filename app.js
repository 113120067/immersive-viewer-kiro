require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var optionsRouter = require('./routes/options');
var uploadRouter = require('./routes/upload');
var apiUploadRouter = require('./src/routes/upload');
var vocabFileStoreRouter = require('./src/routes/vocab-file-store');
var classroomRouter = require('./routes/classroom');
var firebaseConfigRouter = require('./routes/firebase-config');
var immersiveReaderRouter = require('./routes/immersive-reader');
var visionRouter = require('./routes/vision');
var imageGeneratorRouter = require('./routes/image-generator');
var vocabularyGeneratorRouter = require('./routes/vocabulary-generator');
var kidsVocabularyRouter = require('./routes/kids-vocabulary');
var usageStatsRouter = require('./routes/usage-stats');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/options', optionsRouter);
app.use('/', uploadRouter);
app.use('/', apiUploadRouter);
app.use('/', vocabFileStoreRouter);
app.use('/classroom', classroomRouter);
app.use('/config', firebaseConfigRouter);
app.use('/', immersiveReaderRouter);
app.use('/vision', visionRouter);
app.use('/image-generator', imageGeneratorRouter);
app.use('/vocabulary-generator', vocabularyGeneratorRouter);
app.use('/kids-vocabulary', kidsVocabularyRouter);
app.use('/usage-stats', usageStatsRouter);

// Serve test HTML files
app.get('/iphone-debug.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'iphone-debug.html'));
});

app.get('/test-iphone-fix.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-iphone-fix.html'));
});

app.get('/debug-zeabur.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'debug-zeabur.html'));
});

app.get('/simple-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'simple-test.html'));
});

app.get('/test-button-debug.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-button-debug.html'));
});

app.get('/test-responsive-design.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-responsive-design.html'));
});

app.get('/test-speech-speed.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-speech-speed.html'));
});

app.get('/test-homepage-redirect.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-homepage-redirect.html'));
});

app.get('/test-no-auth.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-no-auth.html'));
});

app.get('/test-sentence-support.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-sentence-support.html'));
});

app.get('/final-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'final-test.html'));
});

app.get('/quick-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'quick-test.html'));
});

app.get('/test-image-load.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-image-load.html'));
});

app.get('/test-kids-friendly.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-kids-friendly.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
