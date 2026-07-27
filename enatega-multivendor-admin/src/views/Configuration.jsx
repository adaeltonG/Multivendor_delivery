import React from 'react'
import { withTranslation } from 'react-i18next'
import { useQuery, gql } from '@apollo/client'
import Header from '../components/Headers/Header'
import { getConfiguration } from '../apollo'
import EmailConfiguration from '../components/Configuration/Email/Email'
import Email from '../components/Configuration/FormEmail/FormEmail'
import DeliveryRateConfiguration from '../components/Configuration/DeliveryRate/DeliveryRate'
import PaypalConfiguration from '../components/Configuration/Paypal/Paypal'
import StripeConfiguration from '../components/Configuration/Stripe/Stripe'
import CurrencyConfiguration from '../components/Configuration/Currency/Currency'
import { Grid } from '@mui/material'
import { ReactComponent as ConfigIcon } from '../assets/svg/svg/Configuration.svg'
import TwilioConfiguration from '../components/Configuration/Twilio/Twilio'
import VerificationConfiguration from '../components/Configuration/Verification/Verification'
import SendGridConfiguration from '../components/Configuration/SendGrid/SendGrid'

import SentryConfiguration from '../components/Configuration/Sentry/Sentry'
import GoogleApiKeyConfiguration from '../components/Configuration/GoogleApi/GoogleApi'
import CloudinaryConfiguration from '../components/Configuration/Cloudinary/Cloudinary'
import AmplitudeApiKeyConfiguration from '../components/Configuration/Amplitude/Amplitude'
import GoogleClientIDConfiguration from '../components/Configuration/GoogleClient/GoogleClient'
import WebConfiguration from '../components/Configuration/Web/Web'
import AppConfigurations from '../components/Configuration/App/App'
import FirebaseConfiguration from '../components/Configuration/FireBase/FireBase'

const GET_CONFIGURATION = gql`
  ${getConfiguration}
`
const Configuration = props => {
  const { data, error: errorQuery, loading: loadingQuery } = useQuery(
    GET_CONFIGURATION
  )

  const { t } = props
  const configuration = data && data.configuration

  return (
    <>
      <Header />
      {loadingQuery ? (
        t('LoadingDots')
      ) : errorQuery ? (
        <Grid container ml={2} mt={2}>
          {`${t('Error')}: ${errorQuery.message}`}
        </Grid>
      ) : configuration ? (
        <Grid container ml={2} spacing={2}>
          <Grid item sx={12} md={7} lg={7}>
            <EmailConfiguration
              emailName={configuration.emailName}
              email={configuration.email}
              password={configuration.password}
              enabled={configuration.enableEmail}
            />
          </Grid>
          <Grid
            item
            lg={5}
            sx={{ display: { xs: 'none', lg: 'block' } }}
            ml={-2}>
            <ConfigIcon />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <StripeConfiguration
              publishableKey={configuration.publishableKey}
              secretKey={configuration.secretKey}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <PaypalConfiguration
              clientId={configuration.clientId}
              clientSecret={configuration.clientSecret}
              sandbox={configuration.sandbox}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <CurrencyConfiguration
              currencyCode={configuration.currency}
              currencySymbol={configuration.currencySymbol}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <DeliveryRateConfiguration
              deliveryRate={configuration.deliveryRate}
              costType={configuration.costType}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <TwilioConfiguration
              twilioAccountSid={configuration.twilioAccountSid}
              twilioAuthToken={configuration.twilioAuthToken}
              twilioPhoneNumber={configuration.twilioPhoneNumber}
              twilioEnabled={configuration.twilioEnabled}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <Email formEmail={configuration.formEmail} />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <SendGridConfiguration
              sendGridApiKey={configuration.sendGridApiKey}
              sendGridEnabled={configuration.sendGridEnabled}
              sendGridEmail={configuration.sendGridEmail}
              sendGridEmailName={configuration.sendGridEmailName}
              sendGridPassword={configuration.sendGridPassword}
            />
          </Grid>

          <Grid item sx={12} md={12} lg={5}>
            <WebConfiguration
              googleMapLibraries={configuration.googleMapLibraries}
              googleColor={configuration.googleColor}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <SentryConfiguration
              dashboardSentryUrl={configuration.dashboardSentryUrl}
              webSentryUrl={configuration.webSentryUrl}
              apiSentryUrl={configuration.apiSentryUrl}
              customerAppSentryUrl={configuration.customerAppSentryUrl}
              restaurantAppSentryUrl={configuration.restaurantAppSentryUrl}
              riderAppSentryUrl={configuration.riderAppSentryUrl}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <GoogleApiKeyConfiguration
              googleApiKey={configuration.googleApiKey}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <CloudinaryConfiguration
              cloudinaryUploadUrl={configuration.cloudinaryUploadUrl}
              cloudinaryApiKey={configuration.cloudinaryApiKey}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <AmplitudeApiKeyConfiguration
              webAmplitudeApiKey={configuration.webAmplitudeApiKey}
              appAmplitudeApiKey={configuration.appAmplitudeApiKey}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <GoogleClientIDConfiguration
              webClientID={configuration.webClientID}
              androidClientID={configuration.androidClientID}
              iOSClientID={configuration.iOSClientID}
              expoClientID={configuration.expoClientID}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <FirebaseConfiguration
              firebaseKey={configuration.firebaseKey}
              authDomain={configuration.authDomain}
              projectId={configuration.projectId}
              storageBucket={configuration.storageBucket}
              msgSenderId={configuration.msgSenderId}
              appId={configuration.appId}
              measurementId={configuration.measurementId}
              vapidKey={configuration.vapidKey}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <AppConfigurations
              termsAndConditions={configuration.termsAndConditions}
              privacyPolicy={configuration.privacyPolicy}
              testOtp={configuration.testOtp}
            />
          </Grid>
          <Grid item sx={12} md={12} lg={5}>
            <VerificationConfiguration
              skipEmailVerification={configuration.skipEmailVerification}
              skipMobileVerification={configuration.skipMobileVerification}
            />
          </Grid>
        </Grid>
      ) : (
        <Grid container ml={2} mt={2}>
          {t('Error')}
        </Grid>
      )}
    </>
  )
}

export default withTranslation()(Configuration)
