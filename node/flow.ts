import {
  isCardAuthorization,
  isTokenizedCard,
  AuthorizationRequest,
  AuthorizationResponse,
  Authorizations,
} from '@vtex/payment-provider'

import { randomString, randomUrl } from './utils'

type Flow =
  | 'Authorize'
  | 'Denied'
  | 'Cancel'
  | 'AsyncApproved'
  | 'AsyncDenied'
  | 'BankInvoice'
  | 'Redirect'
  | 'PaymentApp'

export const flows: Record<
  Flow,
  (
    authorization: AuthorizationRequest,
    callback: (response: AuthorizationResponse) => void
  ) => AuthorizationResponse
> = {
  Authorize: request =>
    Authorizations.approve(request, {
      authorizationId: randomString(),
      nsu: randomString(),
      tid: randomString(),
    }),

  Denied: request => Authorizations.deny(request, { tid: randomString() }),

  Cancel: (request, callback) => flows.Authorize(request, callback),

  AsyncApproved: (request, callback) => {
    callback(
      Authorizations.approve(request, {
        authorizationId: randomString(),
        nsu: randomString(),
        tid: randomString(),
      })
    )

    return Authorizations.pending(request, {
      delayToCancel: 1000,
      tid: randomString(),
    })
  },

  AsyncDenied: (request, callback) => {
    callback(Authorizations.deny(request, { tid: randomString() }))

    return Authorizations.pending(request, {
      delayToCancel: 1000,
      tid: randomString(),
    })
  },

  BankInvoice: (request, callback) => {
    callback(
      Authorizations.approve(request, {
        authorizationId: randomString(),
        nsu: randomString(),
        tid: randomString(),
      })
    )
    const { paymentId } = request

    return {
      paymentId,
      status: 'undefined',
      acquirer: null,
      code: null,
      message: null,
      paymentAppData: null,
      identificationNumber: undefined,
      identificationNumberFormatted: undefined,
      barCodeImageNumber: undefined,
      barCodeImageType: undefined,
      delayToCancel: 1000,
      BankIssueInvoiceUrl: "https://www.google.com.br",
      paymentUrl: "https://www.google.com.br",
      tid: randomString(),
    }
  },

  PaymentApp: (request) => {

    const { paymentId, inboundRequestsUrl, callbackUrl } = request

    return {
      paymentId,
      status: 'undefined',
      acquirer: null,
      code: null,
      message: null,
      paymentAppData: {
        appName: 'softsuavepartnersg.payment-provider-protocol-ss',
        payload: JSON.stringify({ inboundRequestsUrl, callbackUrl, paymentId }),
      },
      identificationNumber: undefined,
      identificationNumberFormatted: undefined,
      barCodeImageNumber: undefined,
      barCodeImageType: undefined,
      delayToCancel: 1000,
      tid: randomString(),
    }
  },

  Redirect: (request, callback) => {
    callback(
      Authorizations.approve(request, {
        authorizationId: randomString(),
        nsu: randomString(),
        tid: randomString(),
      })
    )

    return Authorizations.redirect(request, {
      delayToCancel: 1000,
      redirectUrl: randomUrl(),
      tid: randomString(),
    })
  },
}

export type CardNumber =
  | '4444333322221111'
  | '4444333322221112'
  | '4222222222222224'
  | '4222222222222225'
  | 'null'

const cardResponses: Record<CardNumber, Flow> = {
  '4444333322221111': 'Authorize',
  '4444333322221112': 'Denied',
  '4222222222222224': 'AsyncApproved',
  '4222222222222225': 'AsyncDenied',
  null: 'Redirect',
}

const isBankInvoiceAuthorization = (authorization: AuthorizationRequest) =>
  ['BankInvoice', 'Boleto Bancário'].includes(
    authorization.paymentMethod
  )

  const isPaymentAppFlow = (authorization: AuthorizationRequest) =>
  ['PaymentApp'].includes(
    authorization.paymentMethod
  )

const findFlow = (request: AuthorizationRequest): Flow => {
  if (isPaymentAppFlow(request)) return 'PaymentApp'

  if (isBankInvoiceAuthorization(request)) return 'BankInvoice'

  if (isCardAuthorization(request)) {
    const { card } = request
    const cardNumber = isTokenizedCard(card) ? null : card.number

    return cardResponses[cardNumber as CardNumber]
  }

  return 'Authorize'
}

export const executeAuthorization = (
  request: AuthorizationRequest,
  callback: (response: AuthorizationResponse) => void
): AuthorizationResponse => {
  const flow = findFlow(request)

  // eslint-disable-next-line no-console
  console.log(flow)

  return flows[flow](request, callback)
}
