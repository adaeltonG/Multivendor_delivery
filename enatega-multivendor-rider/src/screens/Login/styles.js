import colors from '../../utilities/colors'
import { Platform } from 'react-native'
import { alignment } from '../../utilities/alignment'
export default {
  flex: {
    flex: 1
  },
  bgColor: {
    backgroundColor: colors.themeBackground
  },
  scrollContainer: {
    justifyContent: 'top',
    ...alignment.PTlarge
  },
  container: {
    width: '100%',
    alignSelf: 'center'
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32
  },
  image: {
    alignSelf: 'center',
    height: 150,
    width: 250,
    ...alignment.MBlarge,
    ...alignment.MTmedium
  },
  innerContainer: {
    minHeight: 440,
    backgroundColor: colors.themeBackground,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: colors.headerText,
    shadowOffset: {
      width: 0,
      height: 12
    },
    shadowOpacity: 0.58,
    shadowRadius: 13.0,
    elevation: 24,
    paddingBottom: 36,
    ...alignment.MTlarge
  },
  signInText: {
    marginTop: 50,
    marginBottom: 50
  },
  textInput: {
    width: '80%',
    alignSelf: 'center',
    padding: 15,
    backgroundColor: colors.white,
    borderColor: colors.themeBackground,
    borderWidth: 1,
    borderRadius: 10,
    shadowColor: colors.fontSecondColor,
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 4,
    ...alignment.MTlarge
  },
  passwordField: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    marginLeft: '10%'
  },
  eyeBtn: {
    position: 'relative',
    display: 'flex',
    zIndex: 1,
    elevation: 999,
    marginTop: Platform.OS === 'ios' ? 33 : 40,
    marginLeft: -40,
    color: colors.primary
  },
  btn: {
    width: '70%',
    minHeight: 50,
    alignItems: 'center',
    backgroundColor: colors.black,
    color: colors.white,
    alignSelf: 'center',
    borderRadius: 10,
    marginTop: 48
  },
  pt5: {
    paddingTop: 5
  },
  pt15: {
    paddingTop: 12
  },
  error: {
    marginLeft: '10%',
    ...alignment.MTxSmall
  },
  errorInput: {
    borderColor: colors.textErrorColor
  },
  dividerRow: {
    width: '70%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#D9DEDB'
  },
  dividerText: {
    color: '#65706A',
    marginHorizontal: 12
  },
  googleBtn: {
    width: '70%',
    minHeight: 50,
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CDD5D0',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  googleBtnText: {
    color: '#1E2522',
    marginLeft: 12
  },
  googleHint: {
    width: '72%',
    alignSelf: 'center',
    color: '#65706A',
    marginTop: 10,
    lineHeight: 18
  },
  disabledBtn: {
    opacity: 0.55
  }
}
