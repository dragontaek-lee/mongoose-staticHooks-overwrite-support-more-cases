'use strict';

const assert = require('assert');
const { Query, Model } = require('mongoose');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('Overwriting the built-in Mongoose query middleware with static method', function() {
  describe('querry middleware', function() {
    let db;

    before(function() {
        db = start();
    });
    
    after(async function() {
        await db.close();
    });
    
    beforeEach(() => db.deleteModel(/.*/));

    it('findOne', async function() {

        const schema = new Schema({ name: String, deleted: Boolean });

        schema.statics.findOne = function () {
            let query = Model['findOne'].apply(this, arguments);
            if (!arguments[2] || arguments[2].withDeleted !== true) {
                query.where('deleted').ne(true);
            }
            return query;
        };

        let calledPre = 0;
        let calledPost = 0;
        
        schema.pre('findOne', function(next) {
            ++calledPre;
            assert(this instanceof Query);
            next();
        });

        schema.post('findOne', function() {
            ++calledPost;
            assert(this instanceof Query);
        });

        const model = db.model('Test', schema);

        await model.create({ name: 'foo' , deleted: false});

        const res = await model.findOne();

        assert.ok(res);
        assert.equal(calledPre, 1);
        assert.equal(calledPost, 1);
    });
    })
});
