"use strict";
var hacloudServices = soajsApp.components;
hacloudServices.service('hacloudSrv', [ 'ngDataApi', '$timeout', '$modal', '$sce', function (  ngDataApi, $timeout, $modal, $sce) {
	/**
	 * Service Functions
	 * @param currentScope
	 * @param env
	 * @param noPopulate
	 */
	function listServices(currentScope, cb) {
		var env = currentScope.envCode.toLowerCase();
		var hosts = null;
		currentScope.showCtrlHosts = true;
		currentScope.soajsServices = false;
		currentScope.controllers = [];
		currentScope.recipeTypes = environmentsConfig.recipeTypes;
		
		if (currentScope.access.hacloud.services.list && !currentScope.pauseRefresh) {
			
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/cloud/services/list",
				"params": {
					"env": env
				}
			}, function (error, response) {
				if (error || !response) {
					currentScope.displayAlert('danger', translation.unableRetrieveServicesHostsInformation[LANG]);
					if (cb) {
						return cb();
					}
				}
				else {
					getUpdatesNotifications(response, function () {
						currentScope.myNginx = false;
						currentScope.myController = false;
						currentScope.oldStyle = false;
						if (response && response.length > 0) {
							currentScope.rawServicesResponse = angular.copy(response);
							
							currentScope.deployedInEnv = [];
							
							//migrate dashboard-soajsdata if available and using old tags
							for (let j = 0; j < response.length; j++) {
								let oneService = response[j];
								if (oneService.name === 'dashboard-soajsdata' && oneService.labels['soajs.service.type'] === 'database') {
									oneService.labels['soajs.service.type'] = 'cluster';
									oneService.labels['soajs.service.subtype'] = 'mongo';
									break;
								}
							}
							
							for (var j = 0; j < response.length; j++) {
								if (!hosts) {
									hosts = {};
								}
								
								response[j].expanded = true;
								
								for (var u = 0; u < currentScope.updatesNotifications.length; u++) {
									if (response[j].id === currentScope.updatesNotifications[u].id) {
										switch (currentScope.updatesNotifications[u].mode) {
											case 'image':
												response[j].imageUpdate = true;
												break;
											case 'rebuild':
												response[j].catalogUpdate = true;
												if (currentScope.updatesNotifications[u].repo) {
													response[j].codeUpdate = true;
												}
												break;
											default:
												response[j].codeUpdate = true;
												break;
										}
									}
								}
								
								var failures = 0;
								response[j].tasks.forEach(function (oneTask) {
									if (['running', 'preparing', 'pending', 'starting', 'complete','assigned'].indexOf(oneTask.status.state.toLowerCase()) === -1) {
										failures++;
										oneTask.hideIt = true;
									}
								});
								
								if (failures === response[j].tasks.length) {
									response[j].hideIt = true;
								}
								
								response[j].failures = failures;
								
								let serviceType = response[j].labels['soajs.service.type'] || 'other';
								let serviceSubType = response[j].labels['soajs.service.subtype'] || 'other';
								
								if (serviceType === 'nginx' || serviceType === 'database') {
									currentScope.oldStyle = true;
								}
								
								if (!hosts[serviceType]) {
									hosts[serviceType] = {};
								}
								
								if (!hosts[serviceType][serviceSubType]) {
									hosts[serviceType][serviceSubType] = {};
								}
								
								if (!response[j].labels['soajs.service.version'] || response[j].labels['soajs.service.version'] === '') {
									response[j].labels['soajs.service.version'] = '1';
								}
								
								if (!response[j].labels['soajs.service.name'] || response[j].labels['soajs.service.name'] === '') {
									response[j].labels['soajs.service.name'] = response[j].name;
								}
								
								if (serviceSubType && serviceSubType === 'soajs') {
									currentScope.soajsServices = true;
									
									let serviceGroup = response[j].labels['soajs.service.group'];
									
									//add group value to controller service entry
									if (response[j].labels['soajs.service.name'] === 'controller') {
										currentScope.myController = true;
										response[j].labels['soajs.service.group'] = "SOAJS Core Services";
										response[j].labels['soajs.service.group'] = response[j].labels['soajs.service.group'].toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
										serviceGroup = response[j].labels['soajs.service.group'];
										
										currentScope.controllers.push(response[j]);
										if (currentScope.deployedInEnv.indexOf('controller') === -1) {
											currentScope.deployedInEnv.push('controller');
										}
									}
									
									//check if daemon and get group config name from env variables
									if (serviceType === 'daemon' && response[j].labels['soajs.daemon.group']) {
										response[j].daemonGroup = '';
										for (let k = 0; k < response[j].env.length; k++) {
											if (response[j].env[k].split("=")[0] === 'SOAJS_DAEMON_GRP_CONF') {
												response[j].daemonGroup = response[j].env[k].split("=")[1];
												break;
											}
										}
									}
									
									response[j]['color'] = 'green';
									response[j]['healthy'] = true;
									
									if (!hosts[serviceType][serviceSubType][serviceGroup]) {
										hosts[serviceType][serviceSubType][serviceGroup] = {
											expanded: true,
											list: []
										};
									}
									
									hosts[serviceType][serviceSubType][serviceGroup].list.push(response[j]);
								}
								else {
									
									//service is not SOAJS
									let serviceGroup = 'other';
									if (response[j].labels && response[j].labels['soajs.service.group']) {
										serviceGroup = response[j].labels['soajs.service.group'];
									}
									
									//check if nginx is deployed
									if (['soajs-nginx'].indexOf(serviceGroup) !== -1) {
										if (currentScope.deployedInEnv.indexOf('nginx') === -1) {
											currentScope.deployedInEnv.push('nginx');
											currentScope.myNginx = true;
										}
									}
									
									if (!hosts[serviceType][serviceSubType][serviceGroup]) {
										hosts[serviceType][serviceSubType][serviceGroup] = {
											expanded: true,
											list: []
										};
									}
									
									hosts[serviceType][serviceSubType][serviceGroup].list.push(response[j]);
								}
							}
							
							currentScope.envDeployed = (currentScope.deployedInEnv.length === 2);
							
							if (currentScope.oldStyle) {
								currentScope.myController = currentScope.myNginx = true;
							}
						}
						currentScope.hosts = hosts;
						if (cb) {
							return cb();
						}
					});
				}
			});
		}
		
		function getUpdatesNotifications(envServices, cb) {
			if(!envServices || envServices.length === 0){
				return cb();
			}
			
			//check for code updates
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/cd/ledger',
				params: {
					"env": env
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					currentScope.updatesNotifications = [];
					response.forEach(function (oneCodeUpdateEntry) {
						if (oneCodeUpdateEntry.notify && !oneCodeUpdateEntry.manual) {
							currentScope.updatesNotifications.push({
								id: oneCodeUpdateEntry.serviceId
							})
						}
					});
					
					//check for image or catalog recipe updates
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/cd/updates',
						params: {
							"env": env
						}
					}, function (error, response) {
						if (error) {
							currentScope.displayAlert('danger', error.message);
						}
						else {
							response.forEach(function (oneUpdateEntry) {
								currentScope.updatesNotifications.push({
									id: oneUpdateEntry.id,
									mode: oneUpdateEntry.mode
								})
							});
							return cb();
						}
					});
				}
			});
		}
	}
	
	function checkHeapster(currentScope, cb) {
		if (currentScope.envPlatform !== 'kubernetes') {
			if (cb) return cb();
		}
		else {
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/cloud/resource',
				params: {
					"env": currentScope.envCode,
					"resource": "heapster",
					"namespace": "kube-system"
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					currentScope.isHeapsterDeployed = response.deployed;
					currentScope.isAutoScalable = currentScope.isHeapsterDeployed;
					if (cb) return cb();
				}
			});
		}
	}
	
	/**
	 * List all namespaces for kubernetes deployments and add values to scope
	 *
	 * @param {Scope Object} currentScope
	 * @param {Function} cb
	 */
	function listNamespaces(currentScope, cb) {
		if (currentScope.envPlatform !== 'kubernetes') {
			//in case of swarm deployment, set namespace value to All Namespaces and set filter value to null in order to always display all fields
			currentScope.namespaces = [currentScope.namespaceConfig.defaultValue];
			currentScope.namespaceConfig.namespace = currentScope.namespaceConfig.defaultValue.id;
			return cb();
		}
		
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cloud/namespaces/list',
			params: {
				env: currentScope.envCode.toLowerCase()
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.namespaces = [currentScope.namespaceConfig.defaultValue];
				currentScope.namespaces = currentScope.namespaces.concat(response);
				
				currentScope.namespaceConfig.namespace = currentScope.namespaceConfig.defaultValue.id; //setting current selected to 'All Namespaces'
				
				if (cb && typeof(cb) === 'function') {
					return cb();
				}
			}
		});
	}
	
	function deleteService(currentScope, service, groupName) {
		if (groupName && (groupName === 'soajs' || groupName === 'nginx') && currentScope.envCode.toLowerCase() === 'dashboard') {
			return;
		}
		
		var params = {
			env: currentScope.envCode,
			namespace: service.namespace,
			serviceId: service.id,
			mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : '')
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/cloud/services/delete',
			params: params
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Service deleted successfully');
				currentScope.listServices();
			}
		});
	}
	
	function scaleService(currentScope, service, groupName) {
		$modal.open({
			templateUrl: "scaleService.tmpl",
			size: 'm',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				
				$scope.currentScale = service.tasks.length;
				$scope.title = service.name + ' | Scale Service';
				
				$scope.onSubmit = function () {
					overlayLoading.show();
					
					if (groupName && (groupName === 'soajs' || groupName === 'nginx') && currentScope.envCode.toLowerCase() === 'dashboard') {
						if ($scope.newScale < 1) {
							overlayLoading.hide();
							$scope.message = {
								danger: 'The minimum allowed scale for SOAJS services deployed in DASHBOARD environment is 1.'
							};
							return;
						}
					}
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/dashboard/cloud/services/scale',
						params: {
							namespace: service.namespace || '',
						},
						data: {
							env: currentScope.envCode,
							serviceId: service.id,
							scale: $scope.newScale
						}
					}, function (error, result) {
						overlayLoading.hide();
						$modalInstance.close();
						if (error) {
							currentScope.displayAlert('danger', error.message);
						}
						else {
							currentScope.displayAlert('success', 'Service scaled successfully! If scaling up, new instances will appear as soon as they are ready or on the next refresh');
							$timeout(function () {
								currentScope.listServices();
							}, 1500);
						}
					});
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	}
	
	function inspectService(currentScope, service) {
		var formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		formConfig.entries[0].value = service;
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'serviceInfo',
			label: service.name + ' | Service Info',
			actions: [
				{
					'type': 'reset',
					'label': translation.ok[LANG],
					'btn': 'primary',
					'action': function (formData) {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function redeployService(currentScope, service) {

		var params = {
			env: currentScope.envCode,
			serviceId: service.id,
			mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : ''),
			action: 'redeploy'
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/cloud/services/redeploy',
			params: {
				namespace: service.namespace || ''
			},
			data: params
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Service redeployed successfully');
				currentScope.listServices();
			}
		});
	}


	
	function rebuildService(currentScope, service) {


    console.log(JSON.stringify("rebuildService", null, 2)); // #ja #2del
    // source code updates
    currentScope.configRepos = [];
    currentScope.configReposBranches = {};

    currentScope.setSourceCodeData = function(formData) {
      let recipes = currentScope.recipes;
      let selectedRecipe;
      currentScope.sourceCodeConfig = {
        configuration : {
          isEnabled : false,
          repoAndBranch : {
            disabled : false,
            required : false
          }
        }
      };
      for (let type in currentScope.recipes) {
        recipes[type].forEach(function (catalogRecipe) {
          if(catalogRecipe._id ===  service.labels["soajs.catalog.id"]){
            selectedRecipe = catalogRecipe;
          }
        });
      }
      if (selectedRecipe && selectedRecipe.recipe && selectedRecipe.recipe.deployOptions && selectedRecipe.recipe.deployOptions.sourceCode) {
        let sourceCode = selectedRecipe.recipe.deployOptions.sourceCode;

        let conf = sourceCode.configuration;

        currentScope.selectedSourceCode = selectedRecipe.recipe.deployOptions.sourceCode;

        if(!formData.sourceCode){
          formData.sourceCode = {};
        }

        if (conf) {
          currentScope.sourceCodeConfig.configuration.isEnabled = true;
          currentScope.sourceCodeConfig.configuration.repoAndBranch.disabled = (conf.repo && conf.repo !== '');
          currentScope.sourceCodeConfig.configuration.repoAndBranch.required = conf.required;

          if(conf.repo && conf.repo !== ''){
            if(!formData.sourceCode.configuration){
              formData.sourceCode.configuration = {};
            }

            formData.sourceCode.configuration.repo = conf.repo;
            formData.sourceCode.configuration.branch = conf.branch;
          }
        }

        if(conf){
          currentScope.listAccounts(oneEnv, version, oneSrv, function () {
            // special case: if the form was overwritten from cicd we have to load the branch
            if(formData.sourceCode){
              if(formData.sourceCode.configuration && formData.sourceCode.configuration.repo){
                if(!currentScope.configReposBranches[formData.sourceCode.configuration.repo]){
                  currentScope.fetchBranches(oneEnv, version, oneSrv, 'conf');
                }
              }
            }
          });
        }
      }else{
        if(!formData){
          formData = {};
        }
        formData.sourceCode = {}; // clear
      }
    };

    currentScope.listAccounts = function (oneEnv, version, oneSrv, callback) {
      getSendDataFromServer(currentScope, ngDataApi, {
        'method': 'get',
        'routeName': '/dashboard/gitAccounts/accounts/list',
        params : {
          fullList : true
        }
      }, function (error, response) {
        if (error) {
          currentScope.displayAlert('danger', error.message);
        } else {
          let configRecords = [];

          if(response){
            response.forEach(function (eachAccount) {
              if(eachAccount.repos){
                eachAccount.repos.forEach(function (eachRepo) {
                  // eachRepo : name, serviceName, type
                  if(eachRepo.type === 'config'){
                    configRecords.push({
                      owner : eachAccount.owner,
                      provider : eachAccount.provider,
                      accountId : eachAccount._id.toString(),
                      name : eachRepo.name,
                      type : eachRepo.type,
                      configSHA : eachRepo.configSHA
                    });
                  }
                });
              }
            });
          }

          currentScope.configRepos.config = configRecords;

          callback();
        }
      });
    };

    currentScope.fetchBranches = function (oneEnv, version, oneSrv) {
      let formDataRoot = currentScope.cdConfiguration[oneSrv][oneEnv].cdData.versions[version].options;
      let formData = formDataRoot.custom;

      let selectedRepo = formData.sourceCode.configuration.repo;

      if (!selectedRepo || selectedRepo === '') {
        return;
      }

      let accountData = {};
      currentScope.configRepos.config.forEach(function (eachAcc) {
        if (eachAcc.name === selectedRepo) {
          accountData = eachAcc;
        }
      });

      getSendDataFromServer(currentScope, ngDataApi, {
        'method': 'get',
        'routeName': '/dashboard/gitAccounts/getBranches',
        params: {
          id: accountData.accountId,
          name: selectedRepo,
          type: 'repo',
          provider : accountData.provider
        }
      }, function (error, response) {
        if (error) {
          currentScope.displayAlert('danger', error.message);
        } else {
          currentScope.configReposBranches[selectedRepo] = response.branches;
        }
      });
    };

    getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/catalog/recipes/get',
			params: {
				'id': service.labels['soajs.catalog.id']
			}
		}, function (error, catalogRecipe) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
        currentScope.setSourceCodeData(catalogRecipe);// do api callback before oopening modal

        var formConfig = {
					entries: []
				};
				
				if (catalogRecipe.recipe.deployOptions.image.override) {
					//append images
					formConfig.entries.push({
						'name': "ImagePrefix",
						'label': "Image Prefix",
						'type': 'text',
						'value': catalogRecipe.recipe.deployOptions.image.prefix,
						'fieldMsg': "Override the image prefix if you want"
					});
					
					formConfig.entries.push({
						'name': "ImageName",
						'label': "Image Name",
						'type': 'text',
						'value': catalogRecipe.recipe.deployOptions.image.name,
						'fieldMsg': "Override the image name if you want"
					});
					
					formConfig.entries.push({
						'name': "ImageTag",
						'label': "Image Tag",
						'type': 'text',
						'value': catalogRecipe.recipe.deployOptions.image.tag,
						'fieldMsg': "Override the image tag if you want"
					});




				}
				
				//append inputs whose type is userInput
				for (var envVariable in catalogRecipe.recipe.buildOptions.env) {
					if (catalogRecipe.recipe.buildOptions.env[envVariable].type === 'userInput') {
						
						var defaultValue = catalogRecipe.recipe.buildOptions.env[envVariable].default || '';
						//todo: get value from service.env
						service.env.forEach(function (oneEnv) {
							if (oneEnv.indexOf(envVariable) !== -1) {
								defaultValue = oneEnv.split("=")[1];
							}
						});
						//push a new input for this variable
						var newInput = {
							'name': '_ci_' + envVariable,
							'label': catalogRecipe.recipe.buildOptions.env[envVariable].label || envVariable,
							'type': 'text',
							'value': defaultValue,
							'fieldMsg': catalogRecipe.recipe.buildOptions.env[envVariable].fieldMsg
						};
						
						//if no default value is set, the user input field is required
						if (!defaultValue || defaultValue === '') {
							newInput.required = true;
						}
						
						//if the default value is ***, clear the value and set the field as required
						//this is applicable for tokens whose values are masked by *
						if (newInput.value.match(/^\*+$/g)) {
							newInput.value = '';
							newInput.required = true;
						}
						
						formConfig.entries.push(newInput);
					}
				}


				if(  catalogRecipe.recipe.deployOptions.sourceCode)
        {
          if(  catalogRecipe.recipe.deployOptions.sourceCode.configuration && catalogRecipe.recipe.deployOptions.sourceCode.configuration.label )
          {
            // if the repo is forced. no need to check it.
            // if the repo not selected . we
            // allow him to select.

            if( catalogRecipe.recipe.deployOptions.sourceCode.configuration.repository == ""  )
            {
              var repo = {
                'name': 'repository',
                'label': 'Repository',
                'type': 'select',
                'value': [],
                'fieldMsg': 'Select a repository to deploy from',
                'required': true
              };
            }
            var branch = {
            'name': 'branch',
            'label': 'Branch',
            'type': 'select',
            'value': [],
            'fieldMsg': 'Select a branch to deploy from',
            'required': true
          };


           // formConfig.entries.push(repo);
            // formConfig.entries.push(branch);

          }
          if(  catalogRecipe.recipe.deployOptions.sourceCode.custom)
          {

          }

        }



				if (['service','daemon','other'].indexOf(catalogRecipe.type) !== -1) {
					var newInput = {
						'name': 'branch',
						'label': 'Branch',
						'type': 'select',
						'value': [],
						'fieldMsg': 'Select a branch to deploy from',
						'required': true
					};

					if (service.labels['service.owner'] ) {
						getServiceBranches({
							repo_owner: service.labels['service.owner'],
							repo_name: service.labels['service.repo']
						}, function (response) {
							
							response.branches.forEach(function (oneBranch) {
								delete oneBranch.commit.url;
								newInput.value.push({'v': oneBranch, 'l': oneBranch.name});
							});
							formConfig.entries.push(newInput);
							
							if (formConfig.entries.length === 0) {
								doRebuild(null);
							}
							else {
								var options = {
									timeout: $timeout,
									form: formConfig,
									name: 'rebuildService',
									label: 'Rebuild Service',
									actions: [
										{
											'type': 'submit',
											'label': translation.submit[LANG],
											'btn': 'primary',
											'action': function (formData) {
												doRebuild(formData);
											}
										},
										{
											'type': 'reset',
											'label': translation.cancel[LANG],
											'btn': 'danger',
											'action': function () {
												currentScope.modalInstance.dismiss('cancel');
												currentScope.form.formData = {};
											}
										}
									]
								};
								buildFormWithModal(currentScope, $modal, options);
							}
						});
					}
					else {
						doRebuild(null);
					}
				}

				else {
					if (formConfig.entries.length === 0) {
						doRebuild(null);
					}
					else {
						var options = {
							timeout: $timeout,
							form: formConfig,
							name: 'rebuildService',
							label: 'Rebuild Service',
							actions: [
								{
									'type': 'submit',
									'label': translation.submit[LANG],
									'btn': 'primary',
									'action': function (formData) {
										doRebuild(formData);
									}
								},
								{
									'type': 'reset',
									'label': translation.cancel[LANG],
									'btn': 'danger',
									'action': function () {
										currentScope.modalInstance.dismiss('cancel');
										currentScope.form.formData = {};
									}
								}
							]
						};
						buildFormWithModal(currentScope, $modal, options);
					}
				}

			}
		});
		
		function getServiceBranches(opts, cb) {
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/gitAccounts/accounts/list',
				params: {
					fullList: true
				}
			}, function (error, gitAccounts) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				} else {
					
					let nextOpts = {};
					gitAccounts.forEach((oneGitAccount) => {
						
						for (let i = 0; i < oneGitAccount.repos.length; i++) {
							let oneRepo = oneGitAccount.repos[i];
							if (oneRepo.name === opts.repo_owner + "/" + opts.repo_name) {
								nextOpts._id = oneGitAccount._id;
								nextOpts.provider = oneGitAccount.provider;
								break;
							}
						}
					});
					
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/gitAccounts/getBranches',
						params: {
							'id': nextOpts._id,
							'provider': nextOpts.provider,
							'name': opts.repo_owner + "/" + opts.repo_name,
							'type': 'repo'
						}
					}, function (error, response) {
						if (error) {
							currentScope.displayAlert('danger', error.message);
						} else {
							return cb(response);
						}
					});
				}
			});
		}
		
		function doRebuild(formData) {
			var params = {
				env: currentScope.envCode,
				serviceId: service.id,
				mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : ''),
				action: 'rebuild'
			};
			
			if (formData && Object.keys(formData).length > 0) {
				//inject user input catalog entry and image override
				params.custom = {
					image: {
						name: formData['ImageName'],
						prefix: formData['ImagePrefix'],
						tag: formData['ImageTag']
					}
				};
				
				if (formData.branch) {
					if (!params.custom) {
						params.custom = {};
					}
					
					var t = formData.branch;
					if (typeof t === 'string') {
						t = JSON.parse(angular.copy(formData.branch));
					}
					
					params.custom.branch = t.name;
					if (t.commit && t.commit.sha) {
						params.custom.commit = t.commit.sha;
					}
				}
				
				for (var input in formData) {
					if (input.indexOf('_ci_') !== -1) {
						if (!params.custom.env) {
							params.custom.env = {};
						}
						params.custom.env[input.replace('_ci_', '')] = formData[input];
					}
				}
			}
			
			overlayLoading.show();
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'put',
				routeName: '/dashboard/cloud/services/redeploy',
				params: {
					namespace: service.namespace || ''
				},
				data: params
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					currentScope.displayAlert('success', 'Service rebuilt successfully');
					currentScope.listServices();
					overlayLoading.hide();
					if (currentScope.modalInstance) {
						currentScope.modalInstance.dismiss();
					}
				}
			});
		}
	}
	
	
	/**
	 * Troubleshooting and Maintenance Operations
	 * @param currentScope
	 * @param env
	 * @param oneHost
	 * @param cb
	 */
	function reloadServiceRegistry(currentScope, service) {
		//reload registry for all service instances in parallel
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"params": {
				"namespace": service.namespace || ''
			},
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "reloadRegistry",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(currentScope.envCode, 'danger', translation.errorExecutingReloadRegistryTest[LANG] + " " + service.name + " @ " + new Date().toISOString());
			}
			else {
				var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				response.forEach(function (oneRegistry) {
					service.tasks.forEach(function (oneTask) {
						if (oneTask.id === oneRegistry.id && oneTask.status.state === 'running') {
							formConfig.entries[0].tabs.push({
								'label': oneRegistry.id,
								'entries': [
									{
										'name': service.name,
										'type': 'jsoneditor',
										'height': '500px',
										"value": oneRegistry.response
									}
								]
							});
						}
					});
				});
				
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'reloadRegistry',
					label: "Reloaded Registry of " + service.name,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.registryInfo = [];
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function loadServiceProvision(currentScope, service) {
		//reload provision for all service instances in parallel
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"params": {
				"namespace": service.namespace || ''
			},
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "loadProvision",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(currentScope.envCode, 'danger', "Error Executing Load Provision for: " + service.name + " @ " + new Date().toISOString());
			}
			else {
				
				var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				response.forEach(function (oneRegistry) {
					service.tasks.forEach(function (oneTask) {
						if (oneTask.id === oneRegistry.id && oneTask.status.state === 'running') {
							formConfig.entries[0].tabs.push({
								'label': oneRegistry.id,
								'entries': [
									{
										'name': service.name,
										'type': 'jsoneditor',
										'height': '500px',
										"value": oneRegistry.response
									}
								]
							});
						}
					});
				});
				
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'reloadProvision',
					label: "Reloaded Provisioned Data of " + service.name,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.provisionInfo = [];
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function loadDaemonStats(currentScope, service) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"params": {
				"namespace": service.namespace || ''
			},
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "daemonStats",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(currentScope.envCode, 'danger', "Error Executing Reload Daemon Stat for: " + service.name + " @ " + new Date().toISOString());
			}
			else {
				
				var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				response.forEach(function (oneRegistry) {
					service.tasks.forEach(function (oneTask) {
						if (oneTask.id === oneRegistry.id && oneTask.status.state === 'running') {
							formConfig.entries[0].tabs.push({
								'label': oneRegistry.id,
								'entries': [
									{
										'name': service.name,
										'type': 'jsoneditor',
										'height': '500px',
										"value": oneRegistry.response
									}
								]
							});
						}
					});
				});
				
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'loadDaemonStat',
					label: "Reloaded Daemon Stat for " + service.name,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.provisionInfo = [];
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function loadDaemonGroupConfig(currentScope, service) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"params": {
				"namespace": service.namespace || ''
			},
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "reloadDaemonConf",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, response) {
			if (error) {
				currentScope.generateNewMsg(currentScope.envCode, 'danger', "Error Executing Reload Daemon Group Configuration for: " + service.name + " @ " + new Date().toISOString());
			}
			else {
				
				var formConfig = angular.copy(environmentsConfig.form.multiServiceInfo);
				response.forEach(function (oneRegistry) {
					service.tasks.forEach(function (oneTask) {
						if (oneTask.id === oneRegistry.id && oneTask.status.state === 'running') {
							formConfig.entries[0].tabs.push({
								'label': oneRegistry.id,
								'entries': [
									{
										'name': service.name,
										'type': 'jsoneditor',
										'height': '500px',
										"value": oneRegistry.response
									}
								]
							});
						}
					});
				});
				
				var options = {
					timeout: $timeout,
					form: formConfig,
					name: 'reloadDaemonConf',
					label: "Reloaded Daemon Group Configuration for " + service.name,
					actions: [
						{
							'type': 'reset',
							'label': translation.ok[LANG],
							'btn': 'primary',
							'action': function (formData) {
								currentScope.modalInstance.dismiss('cancel');
								currentScope.provisionInfo = [];
								currentScope.form.formData = {};
							}
						}
					]
				};
				
				buildFormWithModal(currentScope, $modal, options);
			}
		});
	}
	
	function executeHeartbeatTest(currentScope, service) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"params": {
				"namespace": service.namespace || ''
			},
			"data": {
				"serviceId": service.id,
				"serviceName": service.labels['soajs.service.name'],
				"operation": "heartbeat",
				"env": currentScope.envCode,
				"type": service.labels['soajs.service.type']
			}
		}, function (error, heartbeatResponse) {
			if (error) {
				service.color = 'red';
				currentScope.displayAlert('danger', translation.errorExecutingHeartbeatTest[LANG] + " " + service.name + " " + translation.onHostName[LANG] + " @ " + new Date().toISOString());
			}
			else {
				var failCount = 0;
				heartbeatResponse.forEach(function (oneHeartBeat) {
					service.tasks.forEach(function (oneServiceTask) {
						if (oneServiceTask.id === oneHeartBeat.id) {
							if (!oneHeartBeat.response.result) {
								oneServiceTask.status.state = 'Unreachable';
								
								var tooltip = "<b>Code:</b> " + oneHeartBeat.response.error.code + "<br>";
								tooltip += "<b>Errno:</b> " + oneHeartBeat.response.error.errno + "<br>";
								tooltip += "<b>Syscall:</b> " + oneHeartBeat.response.error.syscall + "<br>";
								tooltip += "<b>Address:</b> " + oneHeartBeat.response.error.address + "<br>";
								tooltip += "<b>Port:</b> " + oneHeartBeat.response.error.port + "<br>";
								
								oneServiceTask.status.error = tooltip;
								failCount++;
								
								if (service.labels['soajs.service.name'] === 'controller') {
									currentScope.controllers.forEach(function (oneController) {
										if (oneController.id === oneServiceTask.id) {
											oneController.healthy = false;
										}
									});
								}
							}
							else {
								oneServiceTask.status.state = 'running';
							}
							oneServiceTask.status.lastTs = oneHeartBeat.response.ts;
						}
					});
				});
				
				if (failCount === heartbeatResponse.length) {
					service.color = 'red';
				}
				else {
					service.color = 'green';
				}
			}
		});
	}
	
	function executeAwarenessTest(currentScope, service) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/services/maintenance",
			"params": {
				"namespace": service.namespace || ''
			},
			"data": {
				"serviceId": service.id,
				"serviceName": "controller",
				"operation": "awarenessStat",
				"env": currentScope.envCode,
				"type": "service"
			}
		}, function (error, heartbeatResponse) {
			if (error) {
				currentScope.displayAlert('danger', translation.errorExecutingHeartbeatTest[LANG] + " " + service.name + " " + translation.onHostName[LANG] + " @ " + new Date().toISOString());
			}
			else {
				currentScope.displayAlert('success', "Controller awareness has been reloaded @ " + new Date().toISOString());
			}
		});
	}
	
	function hostLogs(currentScope, service, task) {
		overlayLoading.show();
		currentScope.pauseRefresh = true;
		getSendDataFromServer(currentScope, ngDataApi, {
			method: "get",
			routeName: "/dashboard/cloud/services/instances/logs",
			params: {
				env: currentScope.envCode,
				namespace: service.namespace || '', //pass namespace in case of kubernetes deployment
				serviceId: task.ref.service.id,
				taskId: task.id
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				var autoRefreshPromise;
				
				var mInstance = $modal.open({
					templateUrl: "logBox.html",
					size: 'lg',
					backdrop: true,
					keyboard: false,
					windowClass: 'large-Modal',
					controller: function ($scope, $modalInstance) {
						$scope.title = "Host Logs of " + task.name;
						$scope.data = remove_special(response.data);
						fixBackDrop();
						$timeout(function () {
							highlightMyCode()
						}, 500);
						
						$scope.refreshLogs = function () {
							getSendDataFromServer(currentScope, ngDataApi, {
								method: "get",
								routeName: "/dashboard/cloud/services/instances/logs",
								params: {
									env: currentScope.envCode,
									namespace: service.namespace || '', //pass namespace in case of kubernetes deployment
									serviceId: task.ref.service.id,
									taskId: task.id
								}
							}, function (error, response) {
								if (error) {
									currentScope.displayAlert('danger', error.message);
								}
								else {
									$scope.data = remove_special(response.data).replace("undefined", "").toString();
									if (!$scope.$$phase) {
										$scope.$apply();
									}
									
									fixBackDrop();
									$timeout(function () {
										highlightMyCode()
									}, 500);
									
									autoRefreshPromise = $timeout(function () {
										$scope.refreshLogs();
									}, 5000);
								}
							});
						};
						
						$scope.ok = function () {
							$modalInstance.dismiss('ok');
						};
						
						$scope.refreshLogs();
					}
				});
				
				mInstance.result.then(function () {
					//Get triggers when modal is closed
					currentScope.pauseRefresh = false;
					$timeout.cancel(autoRefreshPromise);
				}, function () {
					//gets triggers when modal is dismissed.
					currentScope.pauseRefresh = false;
					$timeout.cancel(autoRefreshPromise);
				});
			}
		});
		
		function remove_special(str) {
			if (!str) {
				return 'No logs found for this instance'; //in case container has no logs, return message to display
			}
			var rExps = [/[\xC0-\xC2]/g, /[\xE0-\xE2]/g,
				/[\xC8-\xCA]/g, /[\xE8-\xEB]/g,
				/[\xCC-\xCE]/g, /[\xEC-\xEE]/g,
				/[\xD2-\xD4]/g, /[\xF2-\xF4]/g,
				/[\xD9-\xDB]/g, /[\xF9-\xFB]/g,
				/\xD1/, /\xF1/g,
				"/[\u00a0|\u1680|[\u2000-\u2009]|u200a|\u200b|\u2028|\u2029|\u202f|\u205f|\u3000|\xa0]/g",
				/\uFFFD/g,
				/\u000b/g, '/[\u180e|\u000c]/g',
				/\u2013/g, /\u2014/g,
				/\xa9/g, /\xae/g, /\xb7/g, /\u2018/g, /\u2019/g, /\u201c/g, /\u201d/g, /\u2026/g,
				/</g, />/g
			];
			var repChar = ['A', 'a', 'E', 'e', 'I', 'i', 'O', 'o', 'U', 'u', 'N', 'n', ' ', '', '\t', '', '-', '--', '(c)', '(r)', '*', "'", "'", '"', '"', '...', '&lt;', '&gt;'];
			for (var i = 0; i < rExps.length; i++) {
				str = str.replace(rExps[i], repChar[i]);
			}
			for (var x = 0; x < str.length; x++) {
				var charcode = str.charCodeAt(x);
				if ((charcode < 32 || charcode > 126) && charcode != 10 && charcode != 13) {
					str = str.replace(str.charAt(x), "");
				}
			}
			return str;
		}
	}
	
	function autoScale(currentScope, service) {
		$modal.open({
			templateUrl: "autoScale.tmpl",
			size: 'm',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();
				$scope.currentScope = currentScope;
				$scope.title = (service.labels && service.labels['soajs.service.name']) ? service.labels['soajs.service.name'] : service.name;
				$scope.title += ' | Auto Scale';
				if (service.autoscaler) {
					currentScope.autoScaleObject = service.autoscaler;
				} else {
					currentScope.autoScaleObject =
						{
							"replicas": {},
							"metrics": {
								"cpu": {}
							}
						}
				}
				if (service.namespace === "kube-system" || service.namespace === "kube-public") {
					currentScope.message = "This service is part of the Kubernetes " + service.namespace.split("-")[1]  + " namespace and does not support autoscaling.";
				}
				else if (currentScope.envPlatform !== 'kubernetes'){
					currentScope.message =  "Autoscaling is only supported in Kuberentes Deployment.";
				}
				else if (!currentScope.isHeapsterDeployed){
					currentScope.message =  "Heapster is not deployed. Please deploy Heapster to enable Autoscaling.";
				}
				else if (!service.resources || (service.resources && !service.resources.limits)
					|| (service.resources && service.resources.limits && !service.resources.limits.memory)
					|| (service.resources && service.resources.limits && !service.resources.limits.cpu)){
					currentScope.message =  "This service was deployed without autoscaling support.";
				}
				else if (service.labels && service.labels['soajs.service.mode'] === "daemonset"){
					currentScope.message =  "This service is deployed as a " + service.labels['soajs.service.mode'] + " and therefore does not support autoscaling.";
				}
				currentScope.serviceType = (service && service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : null;
				$scope.onSubmit = function (action) {
					overlayLoading.show();
					var data = {
						action: action,
						services: [{"id": service.id, "type": service.labels['soajs.service.mode']}]
					};
					if (action === 'update') {
						data.autoscaler = currentScope.autoScaleObject;
					}
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/dashboard/cloud/services/autoscale',
						params: {
							env: currentScope.envCode,
							namespace: service.namespace || ''
						},
						data: data
					}, function (error) {
						overlayLoading.hide();
						$modalInstance.close();
						if (error) {
							currentScope.displayAlert('danger', error.message);
						}
						else {
							if (action === 'update') {
								currentScope.displayAlert('success', 'Auto Scale is Enabled successfully');
							} else {
								currentScope.displayAlert('success', 'Auto Scale turned off successfully');
							}
							$timeout(function () {
								currentScope.listServices();
							}, 1500);
						}
					});
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	}
	
	function envAutoScale(currentScope) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/environment',
			params: {
				code: currentScope.envCode
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.autoScaleObject =
					{
						"replicas": {},
						"metrics": {
							"cpu": {}
						}
					};
				if (response.deployer && response.deployer.selected) {
					var keys = response.deployer.selected.split(".");
					if (keys.length === 3 && response.deployer[keys[0]][keys[1]][keys[2]].autoscale) {
						currentScope.autoScaleObject = response.deployer[keys[0]][keys[1]][keys[2]].autoscale;
					}
				}
				currentScope.defaultServicesList = [];
				currentScope.customServicesList = [];
				
				currentScope.rawServicesResponse.forEach(function (oneService) {
					if (oneService.labels && oneService.labels['soajs.service.mode'] && oneService.labels['soajs.service.mode'] === "deployment" && oneService.resources && oneService.resources.limits && oneService.resources.limits.cpu) {
						var service = {
							"id": oneService.id,
							"type": "deployment",
							"selected": false
						};
						if (oneService.labels['soajs.service.name']) {
							service.name = oneService.labels['soajs.service.name'];
						} else {
							service.name = oneService.name;
						}
						if (oneService.autoscaler && Object.keys(oneService.autoscaler).length > 0) {
							service.autoscaler = angular.copy(oneService.autoscaler);
							if (currentScope.autoScaleObject && !angular.equals(oneService.autoscaler, currentScope.autoScaleObject)) {
								service.custom = true
							}
						}
						if (service.custom) {
							currentScope.customServicesList.push(service);
						} else {
							currentScope.defaultServicesList.push(service);
						}
					}
				});
				
				$modal.open({
					templateUrl: "envAutoScale.tmpl",
					size: 'm',
					backdrop: true,
					keyboard: true,
					controller: function ($scope, $modalInstance) {
						fixBackDrop();
						$scope.currentScope = currentScope;
						$scope.title = 'Environment Auto Scale';
						$scope.selectDefault = false;
						$scope.selectCustom = false;
						$scope.onSubmit = function (action) {
							overlayLoading.show();
							var data = {
								action: action,
								services: []
							};
							if (currentScope.customServicesList && currentScope.customServicesList.length > 0) {
								currentScope.customServicesList.forEach(function (oneCustom) {
									if (oneCustom.selected) {
										data.services.push({"id": oneCustom.id, "type": oneCustom.type});
									}
								});
							}
							if (currentScope.defaultServicesList && currentScope.defaultServicesList.length > 0) {
								currentScope.defaultServicesList.forEach(function (oneDefault) {
									if (oneDefault.selected) {
										data.services.push({"id": oneDefault.id, "type": oneDefault.type});
									}
								});
							}
							if (action === 'update') {
								data.autoscaler = currentScope.autoScaleObject;
							}
							getSendDataFromServer(currentScope, ngDataApi, {
								method: 'put',
								routeName: '/dashboard/cloud/services/autoscale',
								params: {
									env: currentScope.envCode
								},
								data: data
							}, function (error) {
								if (error) {
									currentScope.displayAlert('danger', error.message);
								}
								else {
									getSendDataFromServer(currentScope, ngDataApi, {
										method: 'put',
										routeName: '/dashboard/cloud/services/autoscale/config',
										params: {
											env: currentScope.envCode
										},
										data: {"autoscale": currentScope.autoScaleObject}
									}, function (error) {
										overlayLoading.hide();
										$modalInstance.close();
										if (error) {
											currentScope.displayAlert('danger', error.message);
										}
										else {
											currentScope.listServices();
											if (action === 'update') {
												currentScope.displayAlert('success', 'Auto Scale is Enabled successfully');
											} else {
												currentScope.displayAlert('success', 'Auto Scale turned off successfully');
											}
										}
									});
								}
							});
						};
						
						$scope.closeModal = function () {
							$modalInstance.close();
						};
						
						$scope.selectAllCustom = function (selectBoolean) {
							$scope.selectCustom = selectBoolean;
							currentScope.customServicesList.forEach(function (oneCustom) {
								oneCustom.selected = $scope.selectCustom;
							});
						};
						
						$scope.selectAllDefault = function (selectBoolean) {
							$scope.selectDefault = selectBoolean;
							currentScope.defaultServicesList.forEach(function (oneDefault) {
								oneDefault.selected = $scope.selectDefault;
							});
						};
					}
				});
			}
		});
	}
	
	return {
		'listServices': listServices,
		'deleteService': deleteService,
		'listNamespaces': listNamespaces,
		'scaleService': scaleService,
		'redeployService': redeployService,
		'rebuildService': rebuildService,
		'autoScale': autoScale,
		'envAutoScale': envAutoScale,
		'checkHeapster': checkHeapster,
		
		'executeHeartbeatTest': executeHeartbeatTest,
		'hostLogs': hostLogs,
		'reloadServiceRegistry': reloadServiceRegistry,
		'loadServiceProvision': loadServiceProvision,
		'inspectService': inspectService,
		'loadDaemonStats': loadDaemonStats,
		"loadDaemonGroupConfig": loadDaemonGroupConfig,
		"executeAwarenessTest": executeAwarenessTest,
	};
}]);
