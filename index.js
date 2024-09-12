'use strict';

const mongoose = require('mongoose');
const assert = require('assert');
const colors = require('colors'); 

const mongoUri = 'mongodb://test:1234@localhost:27017/test?authSource=admin';
mongoose.connect(mongoUri);

const db = mongoose.connection;
db.on('error', console.error.bind(console, colors.red('Connection error:')));
db.once('open', function() {
  console.log(colors.cyan('-------------------------'));
  console.log(colors.green('Connected to MongoDB! 🍃'));
  console.log(colors.cyan('-------------------------'));
  runTests();
});

const Schema = mongoose.Schema;
const { Aggregate, Model } = mongoose;

async function runTests() {
  try {
    console.log(colors.red('[Overwriting the built-in Mongoose aggregate middleware with static method.]'))
    
    // Test 1
    console.log(colors.blue.bold('Running Test 1: Both the custom static method named aggregate middleware and the built-in Mongoose aggregate hooks are triggered.'));

    const schema1 = new Schema({ name: String, deleted: Boolean });

    let calledPre1 = 0;
    let calledPost1 = 0;

    /* 
        The custom static method (aggregate) overwrites an existing aggregate middleware.
        mocked implementation of 'mongoose-delete' plugin which overwrites built-in Mongoose's functions.
    */
    schema1.statics.aggregate = function(pipeline) {
      let match = { $match: { deleted: { '$ne': false } } };

      if (pipeline.length && pipeline[0].$match) {
        pipeline[0].$match.deleted = { '$ne': false };
      } else {
        pipeline.unshift(match);
      }

      const query = Model.aggregate.apply(this, [pipeline]);
      return query;
    };

    schema1.pre('aggregate', function(next) {
      calledPre1++;
      next();
    });

    schema1.post('aggregate', function() {
      calledPost1++;
    });

    const Model1 = mongoose.model('Test_aggregate', schema1);

    await Model1.create({ name: 'foo', deleted: true });

    const res1 = await Model1.aggregate([
      {
        $match: {
          name: 'foo'
        }
      }
    ]);

    assert.ok(res1);

    /*
        The static hooks for the static method named 'aggregate' are not filtered.
        because, in the [mongoose] lib/helpers/model/applyStaticHooks.js file,
        it only filters hooks with names matching the queryMiddlewareFunctions.
        Thus, both the custom static method named aggregate and the built-in Mongoose aggregate hooks are triggered.
    */
    assert.equal(calledPre1, 2, 'Expected pre-aggregate hook to be called twice');
    assert.equal(calledPost1, 2, 'Expected post-aggregate hook to be called twice');

    console.log(colors.green.bold('Test 1 completed ✔️'));

    // Test 2 
    console.log(colors.blue.bold('Running Test 2: Both the custom static method named aggregate and the built-in Mongoose aggregate middleware hooks are triggered, and their this contexts are different.'));

    const schema2 = new Schema({ name: String, deleted: Boolean });

    let calledPre2 = 0;
    let calledPost2 = 0;

    schema2.statics.aggregate = function(pipeline) {
      let match = { $match: { deleted: { '$ne': false } } };

      if (pipeline.length && pipeline[0].$match) {
        pipeline[0].$match.deleted = { '$ne': false };
      } else {
        pipeline.unshift(match);
      }

      const query = Model.aggregate.apply(this, [pipeline]);
      return query;
    };

    /*
        The static hooks for the static method named 'aggregate' are not filtered,
        so it is called twice, as shown in Test 1.
        As a result, when the static 'aggregate' method is called the this context is not Aggregate.
        However, since the static 'aggregate' method overwrites the built-in aggregate function and calls it internally,
        the this context is Aggregate the second time it is invoked.

        [Call Sequence]
        pre('aggregate' (static)) → pre('aggregate' (built-in)) → post('aggregate' (built-in)) → pre('aggregate' (static))
    */
    schema2.pre('aggregate', function(next) {
      calledPre2++;
      if (calledPre2 === 1) {
        assert.equal(this instanceof Aggregate, false, colors.red('Expected this to not be an Aggregate instance in first pre hook'));
      } else if (calledPre2 === 2) {
        assert.equal(this instanceof Aggregate, true, colors.red('Expected this to be an Aggregate instance in second pre hook'));
      }
      next();
    });

    schema2.post('aggregate', function() {
      calledPost2++;
      if (calledPost2 === 1) {
        assert.equal(this instanceof Aggregate, true, colors.red('Expected this to be an Aggregate instance in first post hook'));
      } else if (calledPost2 === 2) {
        assert.equal(this instanceof Aggregate, false, colors.red('Expected this to not be an Aggregate instance in second post hook'));
      }
    });

    const Model2 = mongoose.model('Test_aggregate_2', schema2);

    await Model2.create({ name: 'foo', deleted: true });

    const res2 = await Model2.aggregate([
      {
        $match: {
          name: 'foo'
        }
      }
    ]);

    assert.ok(res2);
    console.log(colors.green.bold('Test 2 completed ✔️'));

    mongoose.connection.close();

  } catch (err) {
    console.error(colors.red('Test failed:'), err);
    mongoose.connection.close();
  }
}
