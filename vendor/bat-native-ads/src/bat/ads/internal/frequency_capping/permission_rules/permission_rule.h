/* Copyright (c) 2019 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef BAT_ADS_INTERNAL_FREQUENCY_CAPPING_PERMISSION_RULES_PERMISSION_RULE_H_
#define BAT_ADS_INTERNAL_FREQUENCY_CAPPING_PERMISSION_RULES_PERMISSION_RULE_H_

#include <string>

#include "bat/ads/internal/ad_events/ad_event_info.h"

namespace ads {

class PermissionRule {
 public:
  virtual ~PermissionRule() = default;

  virtual bool ShouldAllow(
      const AdEventList& ad_events) = 0;

  virtual std::string get_last_message() const = 0;
};

}  // namespace ads

#endif  // BAT_ADS_INTERNAL_FREQUENCY_CAPPING_PERMISSION_RULES_PERMISSION_RULE_H_  // NOLINT
