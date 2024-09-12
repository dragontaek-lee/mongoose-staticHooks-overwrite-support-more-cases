'use strict';

const assert = require('assert');
const { Aggregate, Model } = require('mongoose');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('Overwriting the built-in Mongoose aggregate middleware with static method', function() {
  describe('Aggregate middleware', function() {
    let db;

    before(function() {
        db = start();
    });
    
    after(async function() {
        await db.close();
    });
    
    beforeEach(() => db.deleteModel(/.*/));

    it('Both the custom static method named aggregate and the built-in Mongoose aggregate hooks are triggered.', async function() {
        const schema = new Schema({ name: String, deleted: Boolean });
    
        let calledPre = 0;
        let calledPost = 0;

        schema.statics.aggregate = function (pipeline) {
            let match = { $match: { deleted: { '$ne': false } } };

            if (pipeline.length && pipeline[0].$match) {
                pipeline[0].$match.deleted = { '$ne': false };
            } else {
                pipeline.unshift(match);
            }
            
            const query = Model.aggregate.apply(this, [pipeline]);

            return query;
        };
    
        schema.pre('aggregate', function(next) {
          calledPre++;
          next();
        });

        schema.post('aggregate', function() {
            calledPost++;
        });
    
        const model = db.model('Test_aggregate', schema);
    
        await model.create({ name: 'foo' , deleted: true });

        const res = await model.aggregate([
            {
                $match: {
                    name: 'foo'
                }
            }
        ])

        assert.ok(res);
        assert.equal(calledPre, 2);
        assert.equal(calledPost, 2);
    });

    it('Both the custom static method named aggregate and the built-in Mongoose aggregate hooks are triggered, and their this contexts are different.', async function() {
        const schema = new Schema({ name: String, deleted: Boolean });

        let calledPre = 0;
        let calledPost = 0;

        schema.statics.aggregate = function (pipeline) {
            let match = { $match: { deleted: { '$ne': false } } };

            if (pipeline.length && pipeline[0].$match) {
                pipeline[0].$match.deleted = { '$ne': false };
            } else {
                pipeline.unshift(match);
            }
            
            const query = Model.aggregate.apply(this, [pipeline]);

            return query;
        };
    
        schema.pre('aggregate', function(next) {
            ++calledPre;
            if (calledPre === 1) {
                assert.equal(this instanceof Aggregate, false);
            }

            if (calledPre === 2) {
                assert.equal(this instanceof Aggregate, true);
            }
          next();
        });

        schema.post('aggregate', function() {
            ++calledPost;
            if (calledPost === 1) {
                assert.equal(this instanceof Aggregate, true);
            }

            if (calledPost === 2) {
                assert.equal(this instanceof Aggregate, false);
            }
        });
    
        const model = db.model('Test_aggregate_2', schema);
    
        await model.create({ name: 'foo' , deleted: true });

        await model.aggregate([
            {
                $match: {
                    name: 'foo'
                }
            }
        ])
    });
  });
});
