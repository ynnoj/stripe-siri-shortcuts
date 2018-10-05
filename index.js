const { send } = require('micro')
const { router, get } = require('microrouter')
const cors = require('micro-cors')()

const formatTotal = ({ total, currency }) =>
  total.toLocaleString('en-GB', {
    style: 'currency',
    currency
  })

module.exports = cors(
  router(
    get('/today', async (req, res) => {
      const {
        headers: {
          'stripe-key': stripe_key,
          'revenue-currency': revenue_currency
        }
      } = await req

      if (!stripe_key)
        return send(
          400,
          'No Stripe key provided. Please reconfigure your Siri Shortcut'
        )

      try {
        const stripe = await require('stripe')(stripe_key)

        const { data } = await stripe.charges.list({
          created: {
            gt: new Date()
              .setHours(0, 0, 0, 0)
              .toString()
              .slice(0, 10),
            lt: new Date()
              .getTime()
              .toString()
              .slice(0, 10)
          },
          limit: 100
        })

        const amounts = data.reduce(
          (charge, { amount, currency }) => [
            ...charge,
            ...(currency === revenue_currency.toLowerCase() ? [amount] : [])
          ],
          []
        )

        const total = Math.floor(amounts.reduce((a, b) => a + b, 0)) / 100

        send(
          res,
          200,
          `Today's revenue total is ${formatTotal({
            total,
            currency: revenue_currency
          })}`
        )
      } catch (error) {
        console.log(error)
        send(res, 500, 'There was a problem retrieving your data from Stripe')
      }
    })
  )
)
