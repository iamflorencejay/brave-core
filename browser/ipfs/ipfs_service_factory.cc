/* Copyright (c) 2020 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "brave/browser/ipfs/ipfs_service_factory.h"

#include "base/command_line.h"
#include "base/feature_list.h"
#include "base/path_service.h"
#include "brave/browser/brave_browser_process_impl.h"
#include "brave/browser/profiles/profile_util.h"
#include "brave/components/ipfs/features.h"
#include "brave/components/ipfs/ipfs_constants.h"
#include "brave/components/ipfs/ipfs_service.h"
#include "brave/components/ipfs/ipfs_switches.h"
#include "brave/components/ipfs/pref_names.h"
#include "chrome/browser/profiles/incognito_helpers.h"
#include "chrome/common/chrome_paths.h"
#include "components/keyed_service/content/browser_context_dependency_manager.h"
#include "components/prefs/pref_service.h"
#include "components/user_prefs/user_prefs.h"
#include "extensions/browser/extension_registry_factory.h"
#include "extensions/browser/extension_system.h"
#include "extensions/browser/extension_system_provider.h"
#include "extensions/browser/extensions_browser_client.h"

namespace {

bool IsIpfsEnabled(content::BrowserContext* context) {
  PrefService* local_state = g_brave_browser_process->local_state();
  bool disable_by_policy = (local_state->FindPreference(kIPFSEnabled) &&
                            !local_state->GetBoolean(kIPFSEnabled));

  LOG(ERROR) << "has kIPFSEnabled" << local_state->FindPreference(kIPFSEnabled);
  LOG(ERROR) << "is ipfs pref managed" << local_state->IsManagedPreference(kIPFSEnabled);

  PrefService* user_prefs = user_prefs::UserPrefs::Get(context);
  bool disable_by_user_pref =
      (user_prefs->FindPreference(kIPFSResolveMethod) &&
       user_prefs->GetInteger(kIPFSResolveMethod) ==
           static_cast<int>(ipfs::IPFSResolveMethodTypes::IPFS_DISABLED));

  LOG(ERROR) << "has kIPFSResolveMethod" << user_prefs->FindPreference(kIPFSResolveMethod);


  if (!brave::IsRegularProfile(context) || disable_by_policy ||
      disable_by_user_pref ||
      !base::FeatureList::IsEnabled(ipfs::features::kIpfsFeature) ||
      base::CommandLine::ForCurrentProcess()->HasSwitch(
          ipfs::kDisableIpfsClientUpdaterExtension))
    return false;

  return true;
}

}  // namespace

namespace ipfs {

// static
IpfsServiceFactory* IpfsServiceFactory::GetInstance() {
  return base::Singleton<IpfsServiceFactory>::get();
}

// static
IpfsService* IpfsServiceFactory::GetForContext(
    content::BrowserContext* context) {
  if (!IsIpfsEnabled(context))
    return nullptr;

  return static_cast<IpfsService*>(
      GetInstance()->GetServiceForBrowserContext(context, true));
}

IpfsServiceFactory::IpfsServiceFactory()
    : BrowserContextKeyedServiceFactory(
          "IpfsService",
          BrowserContextDependencyManager::GetInstance()) {
  DependsOn(extensions::ExtensionRegistryFactory::GetInstance());
  DependsOn(
      extensions::ExtensionsBrowserClient::Get()->GetExtensionSystemFactory());
}

IpfsServiceFactory::~IpfsServiceFactory() {}

KeyedService* IpfsServiceFactory::BuildServiceInstanceFor(
    content::BrowserContext* context) const {
  base::FilePath user_data_dir;
  base::PathService::Get(chrome::DIR_USER_DATA, &user_data_dir);
  return new IpfsService(context,
                         g_brave_browser_process
                             ? g_brave_browser_process->ipfs_client_updater()
                             : nullptr,
                         user_data_dir);
}

content::BrowserContext* IpfsServiceFactory::GetBrowserContextToUse(
    content::BrowserContext* context) const {
  return chrome::GetBrowserContextRedirectedInIncognito(context);
}

}  // namespace ipfs
