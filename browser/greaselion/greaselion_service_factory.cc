/* Copyright (c) 2019 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "brave/browser/greaselion/greaselion_service_factory.h"

#include <memory>
#include <string>

#include "base/memory/singleton.h"
#include "brave/browser/brave_browser_process_impl.h"
#include "brave/components/greaselion/browser/greaselion_service.h"
#include "brave/components/greaselion/browser/greaselion_service_impl.h"
#include "chrome/browser/extensions/extension_service.h"
#include "components/keyed_service/content/browser_context_dependency_manager.h"
#include "components/keyed_service/core/keyed_service.h"
#include "extensions/browser/extension_file_task_runner.h"
#include "extensions/browser/extension_registry.h"
#include "extensions/browser/extension_registry_factory.h"
#include "extensions/browser/extension_system.h"
#include "extensions/browser/extension_system_provider.h"
#include "extensions/browser/extensions_browser_client.h"

namespace greaselion {

// static
GreaselionServiceFactory* GreaselionServiceFactory::GetInstance() {
  return base::Singleton<GreaselionServiceFactory>::get();
}

GreaselionService* GreaselionServiceFactory::GetForBrowserContext(
    content::BrowserContext* context) {
  return static_cast<GreaselionService*>(
      GetInstance()->GetServiceForBrowserContext(context, true));
}

GreaselionServiceFactory::GreaselionServiceFactory()
    : BrowserContextKeyedServiceFactory(
          "GreaselionService",
          BrowserContextDependencyManager::GetInstance()) {
  DependsOn(extensions::ExtensionRegistryFactory::GetInstance());
  DependsOn(
      extensions::ExtensionsBrowserClient::Get()->GetExtensionSystemFactory());
}

GreaselionServiceFactory::~GreaselionServiceFactory() = default;

KeyedService* GreaselionServiceFactory::BuildServiceInstanceFor(
    content::BrowserContext* context) const {
  extensions::ExtensionSystem* extension_system =
      extensions::ExtensionSystem::Get(context);
  extensions::ExtensionService* extension_service =
      extension_system->extension_service();
  extensions::ExtensionRegistry* extension_registry =
      extensions::ExtensionRegistry::Get(context);
  base::FilePath install_directory = extension_service->install_directory();
  scoped_refptr<base::SequencedTaskRunner> task_runner =
      extensions::GetExtensionFileTaskRunner();
  std::unique_ptr<GreaselionServiceImpl> greaselion_service(
      new GreaselionServiceImpl(
          g_brave_browser_process->greaselion_download_service(),
          install_directory, extension_system, extension_registry,
          task_runner));
  return greaselion_service.release();
}

bool GreaselionServiceFactory::ServiceIsNULLWhileTesting() const {
  return false;
}

}  // namespace greaselion