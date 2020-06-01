import mongoose, { Schema, Types } from 'mongoose'
import mongooseIdValidator from 'mongoose-id-validator'
import mongooseSlugUpdater from 'mongoose-slug-updater'
import mongooseUniqueValidator from 'mongoose-unique-validator'
import mongoosePaginate from 'mongoose-paginate-v2'

const ArticleSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title should be defined'],
      min: [1, 'Title should not be empty'],
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      slug: 'title',
    },
    abstract: {
      type: String,
      required: [true, 'Abstract should be defined'],
      maxlength: [280, 'Abstract should be less than 280 characters'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Body should be defined'],
      trim: true,
    },
    category: {
      type: Types.ObjectId,
      required: true,
      ref: 'Category',
    },
    comments: [
      {
        type: Types.ObjectId,
        ref: 'Comment',
      },
    ],
  },
  { timestamps: true }
)

ArticleSchema.plugin(mongooseUniqueValidator, {
  message: 'Article already exists',
})
ArticleSchema.plugin(mongooseIdValidator, { message: 'Category not found' })
ArticleSchema.plugin(mongooseSlugUpdater)
ArticleSchema.plugin(mongoosePaginate)

ArticleSchema.methods.toJSON = function () {
  const article = this.toObject()

  return JSON.parse(JSON.stringify(article))
}

ArticleSchema.statics.findOneFeatured = function (conditions) {
  return this.findOne(conditions, {}, { sort: '-createdAt' }).populate(
    'category'
  )
}
ArticleSchema.statics.findLatest = function (conditions, limit = 2) {
  return this.find(conditions, {}, { sort: '-createdAt' })
    .populate('category')
    .limit(limit)
}
ArticleSchema.statics.aggregateArchive = function (categoryId) {
  const aggregation = this.aggregate()

  if (categoryId) {
    aggregation.match({ category: categoryId })
  }

  return aggregation
    .project({
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
    })
    .group({
      _id: { year: '$year', month: '$month' },
      total: { $sum: 1 },
    })
    .sort({ _id: -1 })
    .exec()
}

ArticleSchema.query.bySlug = function (slug) {
  return this.where({ slug })
}

if (
  process.env.NODE_ENV !== 'production' &&
  mongoose.modelNames().includes('Article')
) {
  mongoose.deleteModel('Article')
}

const Article = mongoose.model('Article', ArticleSchema)

export default Article
