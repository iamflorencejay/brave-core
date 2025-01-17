// Copyright (c) 2020 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// you can obtain one at http://mozilla.org/MPL/2.0/.

import * as React from 'react'

// Components
import Stats from './stats'
import TopSitesGrid from './gridSites'
import FooterInfo from './footerInfo'
import SiteRemovalNotification from './notification'
import {
  ClockWidget as Clock,
  RewardsWidget as Rewards,
  TogetherWidget as Together,
  BinanceWidget as Binance,
  AddCardWidget as AddCard,
  GeminiWidget as Gemini,
  BitcoinDotComWidget as BitcoinDotCom,
  CryptoDotComWidget as CryptoDotCom
} from '../../components/default'
import * as Page from '../../components/default/page'
import BrandedWallpaperLogo from '../../components/default/brandedWallpaper/logo'
import { brandedWallpaperLogoClicked } from '../../api/brandedWallpaper'

// Helpers
import VisibilityTimer from '../../helpers/visibilityTimer'
import {
  fetchCryptoDotComTickerPrices,
  fetchCryptoDotComLosersGainers,
  fetchCryptoDotComCharts,
  fetchCryptoDotComSupportedPairs
} from '../../api/cryptoDotCom'
import { generateQRData } from '../../binance-utils'

// Types
import { getLocale } from '../../../common/locale'
import currencyData from '../../components/default/binance/data'
import geminiData from '../../components/default/gemini/data'
import { NewTabActions } from '../../constants/new_tab_types'

// NTP features
import Settings from './settings'

interface Props {
  newTabData: NewTab.State
  gridSitesData: NewTab.GridSitesState
  actions: NewTabActions
  saveShowBackgroundImage: (value: boolean) => void
  saveShowStats: (value: boolean) => void
  saveShowRewards: (value: boolean) => void
  saveShowTogether: (value: boolean) => void
  saveShowBinance: (value: boolean) => void
  saveShowAddCard: (value: boolean) => void
  saveShowGemini: (value: boolean) => void
  saveShowBitcoinDotCom: (value: boolean) => void
  saveShowCryptoDotCom: (value: boolean) => void
  saveBrandedWallpaperOptIn: (value: boolean) => void
}

interface State {
  onlyAnonWallet: boolean
  showSettingsMenu: boolean
  backgroundHasLoaded: boolean
  focusMoreCards: boolean
}

function GetBackgroundImageSrc (props: Props) {
  if (!props.newTabData.showBackgroundImage &&
      (!props.newTabData.brandedWallpaperData || props.newTabData.brandedWallpaperData.isSponsored)) {
    return undefined
  }
  if (props.newTabData.brandedWallpaperData) {
    const wallpaperData = props.newTabData.brandedWallpaperData
    if (wallpaperData && wallpaperData.wallpaperImageUrl) {
      return wallpaperData.wallpaperImageUrl
    }
  }
  if (props.newTabData.backgroundImage && props.newTabData.backgroundImage.source) {
    return props.newTabData.backgroundImage.source
  }
  return undefined
}

function GetIsShowingBrandedWallpaper (props: Props) {
  const { newTabData } = props
  return (newTabData.brandedWallpaperData &&
          newTabData.brandedWallpaperData.isSponsored) ? true : false
}

function GetShouldShowBrandedWallpaperNotification (props: Props) {
  return GetIsShowingBrandedWallpaper(props) &&
  !props.newTabData.isBrandedWallpaperNotificationDismissed
}

class NewTabPage extends React.Component<Props, State> {
  state = {
    onlyAnonWallet: false,
    showSettingsMenu: false,
    backgroundHasLoaded: false,
    focusMoreCards: false
  }
  imageSource?: string = undefined
  timerIdForBrandedWallpaperNotification?: number = undefined
  onVisiblityTimerExpired = () => {
    this.dismissBrandedWallpaperNotification(false)
  }
  visibilityTimer = new VisibilityTimer(this.onVisiblityTimerExpired, 4000)

  componentDidMount () {
    // if a notification is open at component mounting time, close it
    this.props.actions.showTilesRemovedNotice(false)
    this.imageSource = GetBackgroundImageSrc(this.props)
    this.trackCachedImage()
    if (GetShouldShowBrandedWallpaperNotification(this.props)) {
      this.trackBrandedWallpaperNotificationAutoDismiss()
    }
  }

  componentDidUpdate (prevProps: Props) {
    const oldImageSource = GetBackgroundImageSrc(prevProps)
    const newImageSource = GetBackgroundImageSrc(this.props)
    this.imageSource = newImageSource
    if (newImageSource && oldImageSource !== newImageSource) {
      this.trackCachedImage()
    }
    if (oldImageSource &&
      !newImageSource) {
      // reset loaded state
      this.setState({ backgroundHasLoaded: false })
    }
    if (!GetShouldShowBrandedWallpaperNotification(prevProps) &&
        GetShouldShowBrandedWallpaperNotification(this.props)) {
      this.trackBrandedWallpaperNotificationAutoDismiss()
    }

    if (GetShouldShowBrandedWallpaperNotification(prevProps) &&
        !GetShouldShowBrandedWallpaperNotification(this.props)) {
      this.stopWaitingForBrandedWallpaperNotificationAutoDismiss()
    }

    // Handles updates from brave://settings/newTab
    const oldShowRewards = prevProps.newTabData.showRewards
    const oldShowBinance = prevProps.newTabData.showBinance
    const oldShowTogether = prevProps.newTabData.showTogether
    const oldShowGemini = prevProps.newTabData.showGemini
    const oldShowBitcoinDotCom = prevProps.newTabData.showBitcoinDotCom
    const oldShowCryptoDotCom = prevProps.newTabData.showCryptoDotCom
    const { showRewards, showBinance, showTogether, showGemini, showBitcoinDotCom, showCryptoDotCom } = this.props.newTabData

    if (!oldShowRewards && showRewards) {
      this.props.actions.setForegroundStackWidget('rewards')
    } else if (!oldShowBinance && showBinance) {
      this.props.actions.setForegroundStackWidget('binance')
    } else if (!oldShowTogether && showTogether) {
      this.props.actions.setForegroundStackWidget('together')
    } else if (oldShowRewards && !showRewards) {
      this.props.actions.removeStackWidget('rewards')
    } else if (oldShowBinance && !showBinance) {
      this.props.actions.removeStackWidget('binance')
    } else if (oldShowTogether && !showTogether) {
      this.props.actions.removeStackWidget('together')
    } else if (oldShowGemini && !showGemini) {
      this.props.actions.removeStackWidget('gemini')
    } else if (!oldShowGemini && showGemini) {
      this.props.actions.setForegroundStackWidget('gemini')
    } else if (oldShowBitcoinDotCom && !showBitcoinDotCom) {
      this.props.actions.removeStackWidget('bitcoinDotCom')
    } else if (!oldShowBitcoinDotCom && showBitcoinDotCom) {
      this.props.actions.setForegroundStackWidget('bitcoinDotCom')
    } else if (!oldShowCryptoDotCom && showCryptoDotCom) {
      this.props.actions.setForegroundStackWidget('cryptoDotCom')
    } else if (oldShowCryptoDotCom && !showCryptoDotCom) {
      this.props.actions.removeStackWidget('cryptoDotCom')
    }
  }

  trackCachedImage () {
    if (this.imageSource) {
      const imgCache = new Image()
      imgCache.src = this.imageSource
      console.timeStamp('image start loading...')
      imgCache.onload = () => {
        console.timeStamp('image loaded')
        this.setState({
          backgroundHasLoaded: true
        })
      }
    }
  }

  trackBrandedWallpaperNotificationAutoDismiss () {
    // Wait until page has been visible for an uninterupted Y seconds and then
    // dismiss the notification.
    this.visibilityTimer.startTracking()
  }

  stopWaitingForBrandedWallpaperNotificationAutoDismiss () {
    this.visibilityTimer.stopTracking()
  }

  toggleShowBackgroundImage = () => {
    this.props.saveShowBackgroundImage(
      !this.props.newTabData.showBackgroundImage
    )
  }

  toggleShowClock = () => {
    this.props.actions.clockWidgetUpdated(
      !this.props.newTabData.showClock,
      this.props.newTabData.clockFormat)
  }

  toggleClockFormat = () => {
    const currentFormat = this.props.newTabData.clockFormat
    let newFormat
    // cycle through the available options
    switch (currentFormat) {
      case '': newFormat = '12'; break
      case '12': newFormat = '24'; break
      case '24': newFormat = ''; break
      default: newFormat = ''; break
    }
    this.props.actions.clockWidgetUpdated(
      this.props.newTabData.showClock,
      newFormat)
  }

  toggleShowStats = () => {
    this.props.saveShowStats(
      !this.props.newTabData.showStats
    )
  }

  toggleShowTopSites = () => {
    const { showTopSites, customLinksEnabled } = this.props.newTabData
    this.props.actions.setMostVisitedSettings(!showTopSites, customLinksEnabled)
  }

  toggleCustomLinksEnabled = () => {
    const { showTopSites, customLinksEnabled } = this.props.newTabData
    this.props.actions.setMostVisitedSettings(showTopSites, !customLinksEnabled)
  }

  toggleShowRewards = () => {
    const { showRewards } = this.props.newTabData

    if (showRewards) {
      this.removeStackWidget('rewards')
    } else {
      this.setForegroundStackWidget('rewards')
    }

    if (!showRewards) {
      this.props.saveShowAddCard(true)
    }

    this.props.saveShowRewards(!showRewards)
  }

  toggleShowTogether = () => {
    const { showTogether } = this.props.newTabData

    if (showTogether) {
      this.removeStackWidget('together')
    } else {
      this.setForegroundStackWidget('together')
    }

    if (!showTogether) {
      this.props.saveShowAddCard(true)
    }

    this.props.saveShowTogether(!showTogether)
  }

  toggleShowBinance = () => {
    const { showBinance } = this.props.newTabData

    if (showBinance) {
      this.removeStackWidget('binance')
    } else {
      this.setForegroundStackWidget('binance')
    }

    if (!showBinance) {
      this.props.saveShowAddCard(true)
    }

    this.props.saveShowBinance(!showBinance)

    // If we are about to hide the widget, disconnect
    if (showBinance) {
      chrome.binance.revokeToken(() => {
        this.disconnectBinance()
      })
    }
  }

  disableAddCard = () => {
    this.props.saveShowAddCard(false)
  }

  toggleShowGemini = () => {
    const { showGemini } = this.props.newTabData

    if (showGemini) {
      this.removeStackWidget('gemini')
    } else {
      this.setForegroundStackWidget('gemini')
    }

    if (!showGemini) {
      this.props.saveShowAddCard(true)
    }

    this.props.saveShowGemini(!showGemini)

    if (showGemini) {
      chrome.gemini.revokeToken(() => {
        this.disconnectGemini()
      })
    }
  }

  toggleShowBitcoinDotCom = () => {
    const { showBitcoinDotCom } = this.props.newTabData

    if (!showBitcoinDotCom) {
      this.props.saveShowAddCard(true)
    }

    this.props.saveShowBitcoinDotCom(!showBitcoinDotCom)
  }

  toggleShowCryptoDotCom = () => {
    const { showCryptoDotCom } = this.props.newTabData

    if (!showCryptoDotCom) {
      this.props.saveShowAddCard(true)
    }

    this.props.saveShowCryptoDotCom(!showCryptoDotCom)
  }

  onBinanceClientUrl = (clientUrl: string) => {
    this.props.actions.onBinanceClientUrl(clientUrl)
  }

  onGeminiClientUrl = (clientUrl: string) => {
    this.props.actions.onGeminiClientUrl(clientUrl)
  }

  onValidBinanceAuthCode = () => {
    this.props.actions.onValidBinanceAuthCode()
  }

  onValidGeminiAuthCode = () => {
    this.props.actions.onValidGeminiAuthCode()
  }

  setBinanceHideBalance = (hide: boolean) => {
    this.props.actions.setBinanceHideBalance(hide)
  }

  setGeminiHideBalance = (hide: boolean) => {
    this.props.actions.setGeminiHideBalance(hide)
  }

  disconnectBinance = () => {
    this.props.actions.disconnectBinance()
  }

  setBinanceDisconnectInProgress = () => {
    this.props.actions.setBinanceDisconnectInProgress(true)
  }

  cancelBinanceDisconnect = () => {
    this.props.actions.setBinanceDisconnectInProgress(false)
  }

  disconnectGemini = () => {
    this.props.actions.disconnectGemini()
  }

  setGeminiDisconnectInProgress = () => {
    this.props.actions.setGeminiDisconnectInProgress(true)
  }

  cancelGeminiDisconnect = () => {
    this.props.actions.setGeminiDisconnectInProgress(false)
  }

  connectBinance = () => {
    this.props.actions.connectToBinance()
  }

  connectGemini = () => {
    this.props.actions.connectToGemini()
  }

  buyCrypto = (coin: string, amount: string, fiat: string) => {
    const { userTLD } = this.props.newTabData.binanceState
    const refCode = userTLD === 'us' ? '35089877' : '39346846'
    const refParams = `ref=${refCode}&utm_source=brave`

    if (userTLD === 'us') {
      window.open(`https://www.binance.us/en/buy-sell-crypto?crypto=${coin}&amount=${amount}&${refParams}`, '_blank', 'noopener')
    } else {
      window.open(`https://www.binance.com/en/buy-sell-crypto?fiat=${fiat}&crypto=${coin}&amount=${amount}&${refParams}`, '_blank', 'noopener')
    }
  }

  onBuyBitcoinDotComCrypto = () => {
    this.props.actions.buyBitcoinDotComCrypto()
  }

  onInteractionBitcoinDotCom = () => {
    this.props.actions.interactionBitcoinDotCom()
  }

  onBinanceUserTLD = (userTLD: NewTab.BinanceTLD) => {
    this.props.actions.onBinanceUserTLD(userTLD)
  }

  setBalanceInfo = (info: Record<string, Record<string, string>>) => {
    this.props.actions.onAssetsBalanceInfo(info)
  }

  setAssetDepositInfo = (symbol: string, address: string, url: string) => {
    this.props.actions.onAssetDepositInfo(symbol, address, url)
  }

  disableBrandedWallpaper = () => {
    this.props.saveBrandedWallpaperOptIn(false)
  }

  toggleShowBrandedWallpaper = () => {
    this.props.saveBrandedWallpaperOptIn(
      !this.props.newTabData.brandedWallpaperOptIn
    )
  }

  enableAds = () => {
    chrome.braveRewards.saveAdsSetting('adsEnabled', 'true')
  }

  dismissBrandedWallpaperNotification = (isUserAction: boolean) => {
    this.props.actions.dismissBrandedWallpaperNotification(isUserAction)
  }

  dismissNotification = (id: string) => {
    this.props.actions.dismissNotification(id)
  }

  closeSettings = () => {
    this.setState({ showSettingsMenu: false })
  }

  toggleSettings = () => {
    if (this.state.showSettingsMenu) {
      this.setState({ focusMoreCards: false })
    }
    this.setState({
      showSettingsMenu: !this.state.showSettingsMenu
    })
  }

  onClickLogo = () => {
    brandedWallpaperLogoClicked(this.props.newTabData.brandedWallpaperData)
  }

  toggleSettingsAddCard = () => {
    this.setState({
      showSettingsMenu: true,
      focusMoreCards: true
    })
  }

  setForegroundStackWidget = (widget: NewTab.StackWidget) => {
    this.props.actions.setForegroundStackWidget(widget)
  }

  removeStackWidget = (widget: NewTab.StackWidget) => {
    this.props.actions.removeStackWidget(widget)
  }

  setInitialAmount = (amount: string) => {
    this.props.actions.setInitialAmount(amount)
  }

  setInitialFiat = (fiat: string) => {
    this.props.actions.setInitialFiat(fiat)
  }

  setInitialAsset = (asset: string) => {
    this.props.actions.setInitialAsset(asset)
  }

  setUserTLDAutoSet = () => {
    this.props.actions.setUserTLDAutoSet()
  }

  learnMoreRewards = () => {
    window.open('https://brave.com/brave-rewards/', '_blank', 'noopener')
  }

  learnMoreBinance = () => [
    window.open('https://brave.com/binance/', '_blank', 'noopener')
  ]

  setAssetDepositQRCodeSrc = (asset: string, src: string) => {
    this.props.actions.onDepositQRForAsset(asset, src)
  }

  setGeminiAssetDepositQRCodeSrc = (asset: string, src: string) => {
    this.props.actions.onGeminiDepositQRForAsset(asset, src)
  }
  setConvertableAssets = (asset: string, assets: string[]) => {
    this.props.actions.onConvertableAssets(asset, assets)
  }

  setBinanceSelectedView = (view: string) => {
    this.props.actions.setBinanceSelectedView(view)
  }

  setGeminiSelectedView = (view: string) => {
    this.props.actions.setGeminiSelectedView(view)
  }

  setGeminiAuthInvalid = () => {
    this.props.actions.setGeminiAuthInvalid(true)
    this.props.actions.disconnectGemini()
  }

  binanceUpdateActions = () => {
    this.fetchBalance()
    this.getConvertAssets()
  }

  binanceRefreshActions = () => {
    this.fetchBalance()
    this.setDepositInfo()
    this.getConvertAssets()
  }

  geminiUpdateActions = () => {
    this.fetchGeminiTickerPrices()
    this.fetchGeminiBalances()
    this.fetchGeminiDepositInfo()
  }

  fetchGeminiTickerPrices = () => {
    geminiData.currencies.map((asset: string) => {
      chrome.gemini.getTickerPrice(`${asset}usd`, (price: string) => {
        this.props.actions.setGeminiTickerPrice(asset, price)
      })
    })
  }

  onCryptoDotComMarketsRequested = async (assets: string[]) => {
    const [tickerPrices, losersGainers] = await Promise.all([
      fetchCryptoDotComTickerPrices(assets),
      fetchCryptoDotComLosersGainers()
    ])
    this.props.actions.cryptoDotComMarketDataUpdate(tickerPrices, losersGainers)
  }

  onCryptoDotComAssetData = async (assets: string[]) => {
    const [charts, pairs] = await Promise.all([
      fetchCryptoDotComCharts(assets),
      fetchCryptoDotComSupportedPairs()
    ])
    this.props.actions.setCryptoDotComAssetData(charts, pairs)
  }

  cryptoDotComUpdateActions = async () => {
    const { supportedPairs, tickerPrices: prices } = this.props.newTabData.cryptoDotComState
    const assets = Object.keys(prices)
    const supportedPairsSet = Object.keys(supportedPairs).length

    const [tickerPrices, losersGainers, charts] = await Promise.all([
      fetchCryptoDotComTickerPrices(assets),
      fetchCryptoDotComLosersGainers(),
      fetchCryptoDotComCharts(assets)
    ])

    // These are rarely updated, so we only need to fetch them
    // in the refresh interval if they aren't set yet (perhaps due to no connection)
    if (!supportedPairsSet) {
      const pairs = await fetchCryptoDotComSupportedPairs()
      this.props.actions.setCryptoDotComSupportedPairs(pairs)
    }

    this.props.actions.onCryptoDotComRefreshData(tickerPrices, losersGainers, charts)
  }

  onBtcPriceOptIn = async () => {
    this.props.actions.onBtcPriceOptIn()
    this.props.actions.onCryptoDotComInteraction()
    await this.onCryptoDotComMarketsRequested(['BTC'])
  }

  onCryptoDotComBuyCrypto = () => {
    this.props.actions.onCryptoDotComBuyCrypto()
  }

  onCryptoDotComInteraction = () => {
    this.props.actions.onCryptoDotComInteraction()
  }

  onCryptoDotComOptInMarkets = (show: boolean) => {
    this.props.actions.onCryptoDotComOptInMarkets(show)
  }

  fetchGeminiBalances = () => {
    chrome.gemini.getAccountBalances((balances: Record<string, string>, authInvalid: boolean) => {
      if (authInvalid) {
        chrome.gemini.refreshAccessToken((success: boolean) => {
          if (!success) {
            this.setGeminiAuthInvalid()
          }
        })
        return
      }

      this.props.actions.setGeminiAccountBalances(balances)
    })
  }

  fetchGeminiDepositInfo = () => {
    geminiData.currencies.map((asset: string) => {
      chrome.gemini.getDepositInfo(`${asset.toLowerCase()}`, (address: string) => {
        if (!address) {
          return
        }

        this.props.actions.setGeminiAssetAddress(asset, address)
        void generateQRData(address, asset, this.setGeminiAssetDepositQRCodeSrc)
      })
    })
  }

  getCurrencyList = () => {
    const { accountBalances, userTLD } = this.props.newTabData.binanceState
    const { usCurrencies, comCurrencies } = currencyData
    const baseList = userTLD === 'us' ? usCurrencies : comCurrencies

    if (!accountBalances) {
      return baseList
    }

    const accounts = Object.keys(accountBalances)
    const nonHoldingList = baseList.filter((symbol: string) => {
      return !accounts.includes(symbol)
    })

    return accounts.concat(nonHoldingList)
  }

  getConvertAssets = () => {
    chrome.binance.getConvertAssets((assets: any) => {
      for (let asset in assets) {
        if (assets[asset]) {
          this.setConvertableAssets(asset, assets[asset])
        }
      }
    })
  }

  fetchBalance = () => {
    const { depositInfoSaved } = this.props.newTabData.binanceState

    chrome.binance.getAccountBalances((balances: Record<string, Record<string, string>>, success: boolean) => {
      const hasBalances = Object.keys(balances).length

      if (!hasBalances) {
        return
      } else if (!success) {
        this.setAuthInvalid()
        return
      }

      this.setBalanceInfo(balances)

      if (!depositInfoSaved) {
        this.setDepositInfo()
      }
    })
  }

  setDepositInfo = () => {
    chrome.binance.getCoinNetworks((networks: Record<string, string>) => {
      const currencies = this.getCurrencyList()
      for (let ticker in networks) {
        if (currencies.includes(ticker)) {
          chrome.binance.getDepositInfo(ticker, networks[ticker], async (address: string, tag: string) => {
            this.setAssetDepositInfo(ticker, address, tag)
            await generateQRData((tag || address), ticker, this.setAssetDepositQRCodeSrc)
          })
        }
      }
      if (Object.keys(networks).length) {
        this.props.actions.setDepositInfoSaved()
      }
    })
  }

  setAuthInvalid = () => {
    this.props.actions.setAuthInvalid(true)
    this.props.actions.disconnectBinance()
  }

  dismissAuthInvalid = () => {
    this.props.actions.setAuthInvalid(false)
  }

  dismissGeminiAuthInvalid = () => {
    this.props.actions.setGeminiAuthInvalid(false)
  }

  getCryptoContent () {
    const {
      widgetStackOrder,
      binanceState,
      togetherSupported,
      showRewards,
      showBinance,
      showTogether,
      showGemini,
      showBitcoinDotCom,
      geminiSupported,
      bitcoinDotComSupported,
      showCryptoDotCom,
      cryptoDotComSupported
    } = this.props.newTabData
    const lookup = {
      'rewards': {
        display: showRewards,
        render: this.renderRewardsWidget.bind(this)
      },
      'binance': {
        display: binanceState.binanceSupported && showBinance,
        render: this.renderBinanceWidget.bind(this)
      },
      'together': {
        display: togetherSupported && showTogether,
        render: this.renderTogetherWidget.bind(this)
      },
      'gemini': {
        display: showGemini && geminiSupported,
        render: this.renderGeminiWidget.bind(this)
      },
      'bitcoinDotCom': {
        display: showBitcoinDotCom && bitcoinDotComSupported,
        render: this.renderBitcoinDotComWidget.bind(this)
      },
      'cryptoDotCom': {
        display: showCryptoDotCom && cryptoDotComSupported,
        render: this.renderCryptoDotComWidget.bind(this)
      }
    }

    const widgetList = widgetStackOrder.filter((widget: NewTab.StackWidget) => lookup[widget].display)

    return (
      <>
        {widgetList.map((widget: NewTab.StackWidget, i: number) => {
          const isForeground = i === widgetList.length - 1
          return (
            <div key={`widget-${widget}`}>
              {lookup[widget].render(isForeground, (i + 1))}
            </div>
          )
        })}
      </>
    )
  }

  allWidgetsHidden = () => {
    const {
      binanceState,
      togetherSupported,
      showRewards,
      showBinance,
      showTogether,
      geminiSupported,
      showGemini,
      showBitcoinDotCom,
      bitcoinDotComSupported,
      showCryptoDotCom,
      cryptoDotComSupported
    } = this.props.newTabData
    return [
      showRewards,
      togetherSupported && showTogether,
      binanceState.binanceSupported && showBinance,
      geminiSupported && showGemini,
      showBitcoinDotCom && bitcoinDotComSupported,
      cryptoDotComSupported && showCryptoDotCom
    ].every((widget: boolean) => !widget)
  }

  renderCryptoContent () {
    const { newTabData } = this.props
    const { widgetStackOrder, textDirection } = newTabData
    const shouldShowAddCard = !this.allWidgetsHidden()

    if (!widgetStackOrder.length) {
      return null
    }

    return (
      <Page.GridItemWidgetStack>
        {shouldShowAddCard &&
          <AddCard
            isCrypto={true}
            paddingType={'none'}
            menuPosition={'left'}
            widgetTitle={getLocale('addCardWidgetTitle')}
            textDirection={textDirection}
            hideMenu={true}
            hideWidget={this.disableAddCard}
            onAddCard={this.toggleSettingsAddCard}
            stackPosition={0}
          />
        }
        {this.getCryptoContent()}
      </Page.GridItemWidgetStack>
    )
  }

  renderRewardsWidget (showContent: boolean, position: number) {
    const { newTabData } = this.props
    const {
      rewardsState,
      showRewards: rewardsWidgetOn,
      textDirection
    } = newTabData
    const isShowingBrandedWallpaper = GetIsShowingBrandedWallpaper(this.props)
    const shouldShowBrandedWallpaperNotification = GetShouldShowBrandedWallpaperNotification(this.props)
    const shouldShowRewardsWidget = rewardsWidgetOn || shouldShowBrandedWallpaperNotification

    if (!shouldShowRewardsWidget) {
      return null
    }

    return (
      <Rewards
        {...rewardsState}
        widgetTitle={getLocale('rewardsWidgetBraveRewards')}
        onLearnMore={this.learnMoreRewards}
        menuPosition={'left'}
        isCrypto={true}
        paddingType={'none'}
        isCryptoTab={!showContent}
        isForeground={showContent}
        stackPosition={position}
        textDirection={textDirection}
        preventFocus={false}
        hideWidget={this.toggleShowRewards}
        showContent={showContent}
        onShowContent={this.setForegroundStackWidget.bind(this, 'rewards')}
        onEnableAds={this.enableAds}
        isShowingBrandedWallpaper={isShowingBrandedWallpaper}
        showBrandedWallpaperNotification={shouldShowBrandedWallpaperNotification}
        onDisableBrandedWallpaper={this.disableBrandedWallpaper}
        brandedWallpaperData={newTabData.brandedWallpaperData}
        isNotification={!rewardsWidgetOn}
        onDismissNotification={this.dismissNotification}
        onDismissBrandedWallpaperNotification={this.dismissBrandedWallpaperNotification}
      />
    )
  }

  renderTogetherWidget (showContent: boolean, position: number) {
    const { newTabData } = this.props
    const { showTogether, textDirection, togetherSupported } = newTabData

    if (!showTogether || !togetherSupported) {
      return null
    }

    return (
      <Together
        isCrypto={true}
        paddingType={'none'}
        menuPosition={'left'}
        widgetTitle={getLocale('togetherWidgetTitle')}
        isForeground={showContent}
        stackPosition={position}
        textDirection={textDirection}
        hideWidget={this.toggleShowTogether}
        showContent={showContent}
        onShowContent={this.setForegroundStackWidget.bind(this, 'together')}
      />
    )
  }

  renderBinanceWidget (showContent: boolean, position: number) {
    const { newTabData } = this.props
    const { binanceState, showBinance, textDirection } = newTabData
    const menuActions = { onLearnMore: this.learnMoreBinance }

    if (!showBinance || !binanceState.binanceSupported) {
      return null
    }

    if (binanceState.userAuthed) {
      menuActions['onDisconnect'] = this.setBinanceDisconnectInProgress
      menuActions['onRefreshData'] = this.binanceRefreshActions
    }

    return (
      <Binance
        {...menuActions}
        {...binanceState}
        isCrypto={true}
        paddingType={'none'}
        isCryptoTab={!showContent}
        menuPosition={'left'}
        widgetTitle={'Binance'}
        isForeground={showContent}
        stackPosition={position}
        textDirection={textDirection}
        preventFocus={false}
        hideWidget={this.toggleShowBinance}
        showContent={showContent}
        onSetHideBalance={this.setBinanceHideBalance}
        onBinanceClientUrl={this.onBinanceClientUrl}
        onConnectBinance={this.connectBinance}
        onDisconnectBinance={this.disconnectBinance}
        onCancelDisconnect={this.cancelBinanceDisconnect}
        onValidAuthCode={this.onValidBinanceAuthCode}
        onBuyCrypto={this.buyCrypto}
        onBinanceUserTLD={this.onBinanceUserTLD}
        onShowContent={this.setForegroundStackWidget.bind(this, 'binance')}
        onSetInitialAmount={this.setInitialAmount}
        onSetInitialAsset={this.setInitialAsset}
        onSetInitialFiat={this.setInitialFiat}
        onSetUserTLDAutoSet={this.setUserTLDAutoSet}
        onUpdateActions={this.binanceUpdateActions}
        onDismissAuthInvalid={this.dismissAuthInvalid}
        onSetSelectedView={this.setBinanceSelectedView}
        getCurrencyList={this.getCurrencyList}
      />
    )
  }

  renderGeminiWidget (showContent: boolean, position: number) {
    const menuActions = {}
    const { newTabData } = this.props
    const { geminiState, showGemini, textDirection, geminiSupported } = newTabData

    if (!showGemini || !geminiSupported) {
      return null
    }

    if (geminiState.userAuthed) {
      menuActions['onDisconnect'] = this.setGeminiDisconnectInProgress
      menuActions['onRefreshData'] = this.geminiUpdateActions
    }

    return (
      <Gemini
        {...geminiState}
        {...menuActions}
        isCrypto={true}
        paddingType={'none'}
        isCryptoTab={!showContent}
        menuPosition={'left'}
        widgetTitle={'Gemini'}
        isForeground={showContent}
        stackPosition={position}
        textDirection={textDirection}
        preventFocus={false}
        hideWidget={this.toggleShowGemini}
        showContent={showContent}
        onShowContent={this.setForegroundStackWidget.bind(this, 'gemini')}
        onDisableWidget={this.toggleShowGemini}
        onValidAuthCode={this.onValidGeminiAuthCode}
        onConnectGemini={this.connectGemini}
        onGeminiClientUrl={this.onGeminiClientUrl}
        onUpdateActions={this.geminiUpdateActions}
        onSetSelectedView={this.setGeminiSelectedView}
        onSetHideBalance={this.setGeminiHideBalance}
        onCancelDisconnect={this.cancelGeminiDisconnect}
        onDisconnectGemini={this.disconnectGemini}
        onDismissAuthInvalid={this.dismissGeminiAuthInvalid}
      />
    )
  }

  renderBitcoinDotComWidget (showContent: boolean, position: number) {
    const { newTabData } = this.props
    const { showBitcoinDotCom, bitcoinDotComSupported, textDirection } = newTabData

    if (!showBitcoinDotCom || !bitcoinDotComSupported) {
      return null
    }

    return(
      <BitcoinDotCom
        isCrypto={true}
        paddingType={'none'}
        isCryptoTab={!showContent}
        menuPosition={'left'}
        widgetTitle={'Bitcoin.com'}
        isForeground={showContent}
        stackPosition={position}
        textDirection={textDirection}
        preventFocus={false}
        hideWidget={this.toggleShowBitcoinDotCom}
        showContent={showContent}
        onShowContent={this.setForegroundStackWidget.bind(this, 'bitcoinDotCom')}
        onBuyCrypto={this.onBuyBitcoinDotComCrypto}
        onInteraction={this.onInteractionBitcoinDotCom}
        lightWidget={showContent}
      />
    )
  }

  renderCryptoDotComWidget (showContent: boolean, position: number) {
    const { newTabData } = this.props
    const { cryptoDotComState, showCryptoDotCom, textDirection, cryptoDotComSupported } = newTabData

    if (!showCryptoDotCom || !cryptoDotComSupported) {
      return null
    }

    return (
      <CryptoDotCom
        {...cryptoDotComState}
        isCrypto={true}
        paddingType={'none'}
        isCryptoTab={!showContent}
        menuPosition={'left'}
        widgetTitle={'Crypto.com'}
        isForeground={showContent}
        stackPosition={position}
        textDirection={textDirection}
        preventFocus={false}
        hideWidget={this.toggleShowCryptoDotCom}
        showContent={showContent}
        onShowContent={this.setForegroundStackWidget.bind(this, 'cryptoDotCom')}
        onViewMarketsRequested={this.onCryptoDotComMarketsRequested}
        onSetAssetData={this.onCryptoDotComAssetData}
        onUpdateActions={this.cryptoDotComUpdateActions}
        onDisableWidget={this.toggleShowCryptoDotCom}
        onBtcPriceOptIn={this.onBtcPriceOptIn}
        onBuyCrypto={this.onCryptoDotComBuyCrypto}
        onInteraction={this.onCryptoDotComInteraction}
        onOptInMarkets={this.onCryptoDotComOptInMarkets}
      />
    )
  }

  render () {
    const { newTabData, gridSitesData, actions } = this.props
    const { showSettingsMenu, focusMoreCards } = this.state
    const { binanceState } = newTabData

    if (!newTabData) {
      return null
    }

    const hasImage = this.imageSource !== undefined
    const isShowingBrandedWallpaper = newTabData.brandedWallpaperData ? true : false
    const showTopSites = !!this.props.gridSitesData.gridSites.length && newTabData.showTopSites
    const cryptoContent = this.renderCryptoContent()

    return (
      <Page.App dataIsReady={newTabData.initialDataLoaded}>
        <Page.PosterBackground
          hasImage={hasImage}
          imageHasLoaded={this.state.backgroundHasLoaded}
        >
          {hasImage &&
            <img src={this.imageSource} />
          }
        </Page.PosterBackground>
        {hasImage &&
          <Page.Gradient
            imageHasLoaded={this.state.backgroundHasLoaded}
          />
        }
        <Page.Page
            showClock={newTabData.showClock}
            showStats={newTabData.showStats}
            showRewards={!!cryptoContent}
            showTogether={newTabData.showTogether && newTabData.togetherSupported}
            showBinance={newTabData.showBinance}
            showTopSites={showTopSites}
            showAddCard={newTabData.showAddCard}
            showBrandedWallpaper={isShowingBrandedWallpaper}
        >
          {newTabData.showStats &&
          <Page.GridItemStats>
            <Stats
              paddingType={'right'}
              widgetTitle={getLocale('statsTitle')}
              textDirection={newTabData.textDirection}
              stats={newTabData.stats}
              hideWidget={this.toggleShowStats}
              menuPosition={'right'}
            />
          </Page.GridItemStats>
          }
          {newTabData.showClock &&
          <Page.GridItemClock>
            <Clock
              paddingType={'right'}
              widgetTitle={getLocale('clockTitle')}
              textDirection={newTabData.textDirection}
              hideWidget={this.toggleShowClock}
              menuPosition={'left'}
              toggleClickFormat={this.toggleClockFormat}
              clockFormat={newTabData.clockFormat}
            />
          </Page.GridItemClock>
          }
          {
            showTopSites
              ? (
              <Page.GridItemTopSites>
                <TopSitesGrid
                  actions={actions}
                  paddingType={'right'}
                  customLinksEnabled={newTabData.customLinksEnabled}
                  widgetTitle={getLocale('topSitesTitle')}
                  gridSites={gridSitesData.gridSites}
                  menuPosition={'right'}
                  hideWidget={this.toggleShowTopSites}
                  textDirection={newTabData.textDirection}
                />
              </Page.GridItemTopSites>
              ) : null
          }
          {
            gridSitesData.shouldShowSiteRemovedNotification
            ? (
            <Page.GridItemNotification>
              <SiteRemovalNotification actions={actions} />
            </Page.GridItemNotification>
            ) : null
          }
            {cryptoContent}
          <Page.Footer>
            <Page.FooterContent>
            {isShowingBrandedWallpaper && newTabData.brandedWallpaperData &&
            newTabData.brandedWallpaperData.logo &&
            <Page.GridItemBrandedLogo>
              <BrandedWallpaperLogo
                menuPosition={'right'}
                paddingType={'default'}
                textDirection={newTabData.textDirection}
                onClickLogo={this.onClickLogo}
                data={newTabData.brandedWallpaperData.logo}
              />
            </Page.GridItemBrandedLogo>}
            <FooterInfo
              textDirection={newTabData.textDirection}
              onClickSettings={this.toggleSettings}
              backgroundImageInfo={newTabData.backgroundImage}
              showPhotoInfo={!isShowingBrandedWallpaper && newTabData.showBackgroundImage}
            />
            </Page.FooterContent>
          </Page.Footer>
        </Page.Page>
        <Settings
          actions={actions}
          textDirection={newTabData.textDirection}
          showSettingsMenu={showSettingsMenu}
          onClickOutside={this.closeSettings}
          toggleShowBackgroundImage={this.toggleShowBackgroundImage}
          toggleShowClock={this.toggleShowClock}
          toggleShowStats={this.toggleShowStats}
          toggleShowTopSites={this.toggleShowTopSites}
          toggleCustomLinksEnabled={this.toggleCustomLinksEnabled}
          toggleBrandedWallpaperOptIn={this.toggleShowBrandedWallpaper}
          showBackgroundImage={newTabData.showBackgroundImage}
          showClock={newTabData.showClock}
          clockFormat={newTabData.clockFormat}
          showStats={newTabData.showStats}
          showTopSites={newTabData.showTopSites}
          customLinksEnabled={newTabData.customLinksEnabled}
          showRewards={newTabData.showRewards}
          showBinance={newTabData.showBinance}
          brandedWallpaperOptIn={newTabData.brandedWallpaperOptIn}
          allowSponsoredWallpaperUI={newTabData.featureFlagBraveNTPSponsoredImagesWallpaper}
          toggleShowRewards={this.toggleShowRewards}
          toggleShowBinance={this.toggleShowBinance}
          binanceSupported={binanceState.binanceSupported}
          togetherSupported={newTabData.togetherSupported}
          toggleShowTogether={this.toggleShowTogether}
          showTogether={newTabData.showTogether}
          geminiSupported={newTabData.geminiSupported}
          toggleShowGemini={this.toggleShowGemini}
          showCryptoDotCom={newTabData.showCryptoDotCom}
          cryptoDotComSupported={newTabData.cryptoDotComSupported}
          toggleShowCryptoDotCom={this.toggleShowCryptoDotCom}
          showGemini={newTabData.showGemini}
          focusMoreCards={focusMoreCards}
          bitcoinDotComSupported={newTabData.bitcoinDotComSupported}
          showBitcoinDotCom={newTabData.showBitcoinDotCom}
          toggleShowBitcoinDotCom={this.toggleShowBitcoinDotCom}
        />
      </Page.App>
    )
  }
}

export default NewTabPage
