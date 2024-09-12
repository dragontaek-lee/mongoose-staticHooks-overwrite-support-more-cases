# mongoose-staticHooks-overwrite-support-more-cases

This script aims to test how Mongoose handles static methods that overwrite built-in functions, specifically focusing on the aggregate middleware. 

The goal is to observe how both custom static methods and built-in Mongoose hooks (pre/post) are triggered and how the this context behaves during their invocation.

## used NPM scripts
```bash
# run unit tests suite
$ npm run test

# run the case file
# need docker desktop on before executing
$ npm run start
```
Both scripts have the same content. You can check the code and use whichever you prefer.

## Content
```javascript
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

```
Assume that the static method overwrites the built-in Mongoose aggregate function.

```javascript
schema1.pre('aggregate', function(next) {
    console.log(this);
    next();
});

schema1.post('aggregate', function() {
    console.log(this);
});
```
In this situation, also assume that there are pre and post hooks for aggregate.

#### Test 1 
- both the custom static method and the built-in Mongoose aggregate hooks are executed and both the pre- and post-hooks are called twice

#### Test 2
- this context differs between the custom static method and the built-in aggregate function. 
- in the first pre-hook and the second post-hook call, this is not an instance of Aggregate, but in the second pre-hook and the first post-hook call, it becomes an instance of Aggregate.
