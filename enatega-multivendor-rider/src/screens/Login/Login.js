import React from 'react'
import {
  View,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import styles from './styles'
import colors from '../../utilities/colors'
import TextDefault from '../../components/Text/TextDefault/TextDefault'
import RiderLogin from '../../assets/svg/RiderLogin.png'
import { FontAwesome, Ionicons } from '@expo/vector-icons'
import Spinner from '../../components/Spinner/Spinner'
import useLogin from './useLogin'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const {
    username,
    setUsername,
    password,
    setPassword,
    usernameError,
    passwordError,
    onSubmit,
    showPassword,
    setShowPassword,
    loading,
    googleLoading,
    googleAuthConfigured,
    googleRequest,
    onGoogleSubmit
  } = useLogin()

  const { t } = useTranslation()

  // if (username == null || password == null) {
  //    setPassword('')
  //    setUsername('')
  // }

  return (
    <SafeAreaView style={[styles.flex, styles.bgColor]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        style={styles.container}>
        <Image
          source={RiderLogin}
          style={[styles.image]}
          height={150}
          width={250}
        />
        <View style={styles.innerContainer}>
          <TextDefault bolder H2 center style={styles.signInText}>
            {t('signInText')}
          </TextDefault>
          <TextInput
            style={[styles.textInput, usernameError && styles.errorInput]}
            placeholder={t('username')}
            value={username}
            editable={!loading && !googleLoading}
            onChangeText={e => setUsername(e)}
          />
          {usernameError ? (
            <TextDefault
              style={styles.error}
              bold
              textColor={colors.textErrorColor}>
              {usernameError}
            </TextDefault>
          ) : null}
          <View style={styles.passwordField}>
            <TextInput
              secureTextEntry={showPassword}
              placeholder={t('password')}
              style={[
                styles.textInput,
                styles.passwordInput,
                passwordError && styles.errorInput
              ]}
              value={password}
              editable={!loading && !googleLoading}
              onChangeText={e => setPassword(e)}
            />
            <FontAwesome
              onPress={() => {
                if (!loading && !googleLoading) setShowPassword(!showPassword)
              }}
              name={showPassword ? 'eye' : 'eye-slash'}
              size={24}
              style={styles.eyeBtn}
            />
          </View>
          {passwordError ? (
            <View>
              <TextDefault
                style={styles.error}
                bold
                textColor={colors.textErrorColor}>
                {passwordError}
              </TextDefault>
            </View>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={loading || googleLoading}
            style={[
              styles.btn,
              loading ? styles.pt5 : styles.pt15,
              (loading || googleLoading) && styles.disabledBtn
            ]}
            onPress={() => onSubmit()}>
            <TextDefault H4 bold textColor={colors.white}>
              {loading ? <Spinner size="small" /> : t('signInBtn')}
            </TextDefault>
          </TouchableOpacity>
          {googleAuthConfigured ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <TextDefault style={styles.dividerText}>{t('or')}</TextDefault>
                <View style={styles.divider} />
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('continueWithGoogle')}
                activeOpacity={0.75}
                disabled={!googleRequest || loading || googleLoading}
                style={[
                  styles.googleBtn,
                  (!googleRequest || loading || googleLoading) &&
                    styles.disabledBtn
                ]}
                onPress={onGoogleSubmit}>
                {googleLoading ? (
                  <Spinner size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={21} color="#4285F4" />
                    <TextDefault bold style={styles.googleBtnText}>
                      {t('continueWithGoogle')}
                    </TextDefault>
                  </>
                )}
              </TouchableOpacity>
              <TextDefault center style={styles.googleHint}>
                {t('googleRiderAccountHint')}
              </TextDefault>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
