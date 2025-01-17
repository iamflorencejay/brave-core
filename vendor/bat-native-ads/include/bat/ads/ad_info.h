/* Copyright (c) 2020 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef BAT_ADS_AD_INFO_H_
#define BAT_ADS_AD_INFO_H_

#include <string>

#include "bat/ads/export.h"

namespace ads {

struct ADS_EXPORT AdInfo {
  AdInfo();
  AdInfo(
      const AdInfo& info);
  ~AdInfo();

  std::string uuid;
  std::string creative_instance_id;
  std::string creative_set_id;
  std::string campaign_id;
  std::string category;
  std::string target_url;
  std::string geo_target;
};

}  // namespace ads

#endif  // BAT_ADS_AD_INFO_H_
