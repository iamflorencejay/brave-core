/* Copyright (c) 2020 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "bat/ads/internal/ad_events/new_tab_page_ads/new_tab_page_ad_event_factory.h"

#include "bat/ads/internal/ad_events/new_tab_page_ads/new_tab_page_ad_event_clicked.h"
#include "bat/ads/internal/ad_events/new_tab_page_ads/new_tab_page_ad_event_viewed.h"
#include "bat/ads/new_tab_page_ad_info.h"

namespace ads {

std::unique_ptr<AdEvent<NewTabPageAdInfo>> NewTabPageAdEventFactory::Build(
    AdsImpl* ads,
    const NewTabPageAdEventType event_type) {
  DCHECK(ads);

  switch (event_type) {
    case NewTabPageAdEventType::kViewed: {
      return std::make_unique<NewTabPageAdEventViewed>(ads);
    }

    case NewTabPageAdEventType::kClicked: {
      return std::make_unique<NewTabPageAdEventClicked>(ads);
    }
  }
}

}  // namespace ads
