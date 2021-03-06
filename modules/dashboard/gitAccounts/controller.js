'use strict';

var gitAccountsApp = soajsApp.components;
gitAccountsApp.controller ('gitAccountsAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', 'repoSrv', function ($scope, $timeout, $modal, ngDataApi, injectFiles, repoSrv) {
    $scope.$parent.isUserLoggedIn();

    $scope.access = {};
    constructModulePermissions($scope, $scope.access, gitAccountsAppConfig.permissions);

    $scope.referToDoc = 'Refer to the online documentation at ' + '<a target="_blank" href="http://soajs.org/#/documentation">SOAJS Website.</a>';
    $scope.whitelistedRepos = whitelistedRepos;

    $scope.defaultPageNumber = 1;
    $scope.defaultPerPage = 50;

    $scope.imagePath = './themes/' + themeToUse + '/img/loading.gif';
	$scope.showRepos = function (pack) {
		pack.showDetails = true;
	};
	$scope.hideRepos = function (pack) {
		pack.showDetails = false;
	};
    $scope.listAccounts = function () {
        getSendDataFromServer($scope, ngDataApi, {
            'method': 'get',
            'routeName': '/dashboard/gitAccounts/accounts/list'
        }, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
            } else {
                $scope.accounts = response;

                $scope.accounts.forEach(function(oneAccount){
                	oneAccount.hide = true;
                });

                if ($scope.accounts.length > 0) {
                    var counter = 0;
                    $scope.listRepos($scope.accounts, counter, 'getRepos');
                }
                if($scope.accounts.length === 1){
                	$scope.accounts[0].hide = false;
                	$scope.accounts[0].icon = 'minus';
                }
            }
        });
    };

    $scope.addAccount = function () {
        var formConfig = angular.copy(gitAccountsAppConfig.form.login);
        var options = {
            timeout: $timeout,
            form: formConfig,
            name: 'addGitAccount',
            label: translation.addNewGitAccount[LANG],
            actions: [
                {
                    'type': 'submit',
                    'label': 'Submit',
                    'btn': 'primary',
                    'action': function (formData) {
                        var postData = {
                            provider: formData.provider,
                            domain: formData.providerDomain,
                            label: formData.label,
                            username: formData.username,
                            type: formData.type.split('_')[0],
                            access: formData.type.split('_')[1]
                        };

                        if (formData.password) {
                            postData.password = formData.password;
                        }

                        if (formData.oauthKey && formData.oauthSecret) {
                            postData.oauthKey = formData.oauthKey;
                            postData.oauthSecret = formData.oauthSecret;
                        }

                        overlayLoading.show();
                        getSendDataFromServer($scope, ngDataApi, {
                            'method': 'post',
                            'routeName': '/dashboard/gitAccounts/login',
                            'data': postData
                        }, function (error) {
                            overlayLoading.hide();
                            if (error) {
                                $scope.form.displayAlert('danger', error.message);
                            } else {
                                $scope.$parent.displayAlert('success', translation.loginSuccessful[LANG]);
                                $scope.modalInstance.close();
                                $scope.form.formData = {};
                                $scope.listAccounts();
                            }
                        });
                    }
                },
                {
                    'type': 'reset',
                    'label': 'Cancel',
                    'btn': 'danger',
                    'action': function () {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.form.formData = {};
                    }
                }
            ]
        };
        buildFormWithModal($scope, $modal, options);
    };

    $scope.deleteAccount = function (account) {
        if (account.access === 'public' || account.provider !== 'github') {
            getSendDataFromServer($scope, ngDataApi, {
                'method': 'delete',
                'routeName': '/dashboard/gitAccounts/logout',
                'params': {
                    id: account._id.toString(),
                    provider: account.provider,
                    username: account.owner
                }
            }, function (error) {
                if (error) {
                    $scope.displayAlert('danger', error.message);
                } else {
                    $scope.displayAlert('success', translation.logoutSuccessful[LANG]);
                    $scope.listAccounts();
                }
            });
        } else if (account.access === 'private') {
            var formConfig = angular.copy(gitAccountsAppConfig.form.logout);
            var options = {
                timeout: $timeout,
                form: formConfig,
                name: 'removeGithubAccount',
                label: 'Remove GitHub Account',
                actions: [
                    {
                        'type': 'submit',
                        'label': 'Submit',
                        'btn': 'primary',
                        'action': function (formData) {
                            var params = {
                                id: account._id.toString(),
                                password: formData.password
                            };
                            getSendDataFromServer($scope, ngDataApi, {
                                'method': 'delete',
                                'routeName': '/dashboard/gitAccounts/logout',
                                'params': params
                            }, function (error) {
                                if (error) {
                                    $scope.$parent.displayAlert('danger', error.message);
                                    $scope.modalInstance.close();
                                } else {
                                    $scope.$parent.displayAlert('success', translation.logoutSuccessful[LANG]);
                                    $scope.modalInstance.close();
                                    $scope.form.formData = {};
                                    $scope.listAccounts();
                                }
                            });
                        }
                    },
                    {
                        'type': 'reset',
                        'label': 'Cancel',
                        'btn': 'danger',
                        'action': function () {
                            $scope.modalInstance.dismiss('cancel');
                            $scope.form.formData = {};
                        }
                    }
                ]
            };
            buildFormWithModal($scope, $modal, options);
        }
    };
    
	let disablePaginations = false;
	
	$scope.listReposWithSearch = function (oneAccount, counter, action, name) {
		if ((oneAccount.provider === "bitbucket" || oneAccount.provider === "bitbucket_enterprise")) {
			if (name) {
				disablePaginations = true;
			}
			let id = oneAccount._id;
			
			if (!oneAccount.nextPageNumber) {
				oneAccount.nextPageNumber = $scope.defaultPageNumber;
			}
			let opts = {
				"method": "get",
				"routeName": "/dashboard/gitAccounts/getRepos",
				"params": {
					id: id,
					provider: oneAccount.provider,
					per_page: $scope.defaultPerPage,
					page: (action === 'loadMore') ? oneAccount.nextPageNumber : $scope.defaultPageNumber
				}
			};
			
			if (name && name.length > 2) {
				opts.params.name = name;
			}
			
			if (disablePaginations) {
				opts.params.page = $scope.defaultPageNumber;
			}
			if (!name || name.length > 2) {
				overlayLoading.show();
				getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
					overlayLoading.hide();
					if (error) {
						if (!opts.params.name) {
							disablePaginations = false;
						}
						$scope.displayAlert('danger', error.message);
					} else {
						if (opts.params.name || disablePaginations) {
							oneAccount.repos = response;
						} else if (action === 'loadMore') {
							$scope.appendNewRepos(oneAccount, response);
						} else if (action === 'getRepos') {
							
							if (oneAccount.owner === 'soajs') {
								oneAccount.repos = [];
								response.forEach(function (oneRepo) {
									if ($scope.whitelistedRepos.indexOf(oneRepo.full_name) !== -1) {
										oneAccount.repos.push(oneRepo);
									}
								});
							} else {
								oneAccount.repos = response;
							}
							oneAccount.nextPageNumber = 2;
							oneAccount.allowLoadMore = (response.length === $scope.defaultPerPage);
						}
						if (!opts.params.name) {
							disablePaginations = false;
						}
					}
				});
			}
		}
	};
	
    $scope.listRepos = function (accounts, counter, action) {
        if (!Array.isArray(accounts)) {
            accounts = [accounts];
        }

        //get repos of all accounts in parallel
        accounts.forEach(function (oneAccount) {
            var id = oneAccount._id;
            oneAccount.loading = true;
            if (!oneAccount.nextPageNumber) {
                oneAccount.nextPageNumber = $scope.defaultPageNumber;
            }

            getSendDataFromServer($scope, ngDataApi, {
                "method": "get",
                "routeName": "/dashboard/gitAccounts/getRepos",
                "params": {
                    id: id,
                    provider: oneAccount.provider,
                    per_page: $scope.defaultPerPage,
                    page: (action === 'loadMore') ? oneAccount.nextPageNumber : $scope.defaultPageNumber
                }
            }, function (error, response) {
                oneAccount.loading = false;
                if (error) {
                    $scope.displayAlert('danger', error.message);
                } else {
                    if (action === 'loadMore') {
                        $scope.appendNewRepos(oneAccount, response);
                    }
                    else if (action === 'getRepos') {

                        if (oneAccount.owner === 'soajs') {
                            oneAccount.repos = [];
                            response.forEach (function (oneRepo) {
                                if ($scope.whitelistedRepos.indexOf(oneRepo.full_name) !== -1) {
                                    oneAccount.repos.push(oneRepo);
                                }
                            });
                        }
                        else {
                            oneAccount.repos = response;
                        }

                        oneAccount.nextPageNumber = 2;
                        oneAccount.allowLoadMore = (response.length === $scope.defaultPerPage);
                    }
                }
            });
        });
    };

    $scope.appendNewRepos = function (account, repos) {
        account.nextPageNumber++;
        account.allowLoadMore = (repos.length === $scope.defaultPerPage);

        if (!account.repos) {
            account.repos = [];
        }

        if (account.owner === 'soajs') {
            repos.forEach (function (oneRepo) {
                if ($scope.whitelistedRepos.indexOf(oneRepo.full_name) !== -1) {
                    account.repos.push(oneRepo);
                }
            });
            setTimeout(function(){
                jQuery('#reposList').animate({scrollTop: jQuery('#reposList').prop("scrollHeight")}, 1500);
            },500);
        }
        else {
            account.repos = account.repos.concat(repos);
            setTimeout(function(){
                jQuery('#reposList').animate({scrollTop: jQuery('#reposList').prop("scrollHeight")}, 1500);
            },500);
        }
    };

    $scope.activateRepo = function (account, repo) {
        var formConfig = angular.copy(gitAccountsAppConfig.form.selectConfigBranch);
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/gitAccounts/getBranches',
            params: {
                name: repo.full_name,
                type: 'repo',
                id: account._id.toString(),
                provider: account.provider
            }
        }, function (error, result) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
            	let git = {
            		branches: []
	            };
                result.branches.forEach(function (oneBranch) {
                    formConfig.entries[0].value.push({'v': oneBranch.name, 'l': oneBranch.name});
                });

                var options = {
                    timeout: $timeout,
                    form: formConfig,
                    name: 'selectConfigBranch',
                    label: translation.chooseConfigBranch[LANG],
                    actions: [
                        {
                            'type': 'submit',
                            'label': 'Submit',
                            'btn': 'primary',
                            'action': function (formData) {
                                overlayLoading.show();
	                            result.branches.forEach(function (oneBranch) {
		                            git.branches.push({
			                           name : oneBranch.name,
			                           active : formData.branch === oneBranch.name
		                            });
	                            });
	                            getSendDataFromServer($scope, ngDataApi, {
                                    method: 'post',
                                    routeName: '/dashboard/gitAccounts/repo/activate',
                                    params: {
                                        id: account._id.toString(),
                                        provider: account.provider
                                    },
                                    data: {
                                        provider: account.provider,
                                        owner: repo.owner.login,
                                        repo: repo.name,
                                        project: repo.project ? repo.project.key : null,
                                        configBranch: formData.branch,
	                                    git
                                    }
                                }, function (error, response) {
		                            overlayLoading.hide();
		                            if (error) {
                                        $scope.modalInstance.dismiss('cancel');
                                        $scope.form.formData = {};
                                        var outerScope = $scope;
                                        var errorDisplay = $modal.open({
                                            templateUrl: 'errorDisplay.tmpl',
                                            backdrop: true,
                                            keyboard: true,
                                            controller: function ($scope) {
                                                fixBackDrop();

                                                $scope.title = translation.repoActivationFailed[LANG];
                                                $scope.error = error.message;
                                                if($scope.error.indexOf("Error[999]") === -1){
                                                    $scope.error += "<br>" + outerScope.referToDoc;
                                                }
                                                $scope.ok = function () {
                                                    errorDisplay.close();
                                                }
                                            }
                                        });
                                    } else {
                                        $scope.modalInstance.dismiss('cancel');
                                        $scope.form.formData = {};
                                        $scope.displayAlert('success', translation.repoHasBeenActivated[LANG]);
                                        repo.status = 'active';
                                        if(response.type){
                                        	repo.type = response.type;
                                        }
                                        if (Array.isArray(response) || (typeof (response) === 'object' && response.repo && ['service', 'daemon', 'custom','config','component','static'].indexOf(response.type) === -1)) {
		                                    repo.type = 'mutli';
	                                        
                                        	var repoAddSuccess = $modal.open({
                                                templateUrl: 'repoAddSuccess.tmpl',
                                                backdrop: true,
                                                keyboard: true,
                                                controller: function ($scope) {
                                                    fixBackDrop();
                                                    if (Array.isArray(response)) {
                                                        $scope.added = response;
                                                    } else {
                                                        $scope.added = [response];
                                                    }

                                                    $scope.ok = function () {
                                                        repoAddSuccess.close();
                                                    }
                                                }
                                            });
                                        }
                                        if (response.noApi){
	                                        var outerScope = $scope;
	                                        let noSwaggerFile = $modal.open({
		                                        templateUrl: 'noSwagger.tmpl',
		                                        backdrop: true,
		                                        keyboard: true,
		                                        controller: function ($scope) {
			                                        fixBackDrop();
			                                        $scope.title = translation.repoActivationSucceeded[LANG];
			                                        $scope.error = translation.repoNoSwaggerFileDetected[LANG];
			                                        if(response.reason && [983, 984, 985, 986].indexOf(response.reason) !== -1){
				                                        $scope.error = "Your repository got turned on, you have a problem with the swagger file, you will not be able to browse and secure the API of this service"
			                                        }
			                                        $scope.error += "<br>" + outerScope.referToDoc;
			                                        $scope.ok = function () {
				                                        noSwaggerFile.close();
			                                        }
		                                        }
	                                        });
                                        }
			                            repo.configBranch = formData.branch;
                                        if ( ['service', 'daemon', 'mutli'].indexOf(repo.type) !== -1){
	                                        repo.git = git;
                                        }
                                    }
                                });
                            }
                        },
                        {
                            'type': 'reset',
                            'label': 'Cancel',
                            'btn': 'danger',
                            'action': function () {
                                $scope.modalInstance.dismiss('cancel');
                                $scope.form.formData = {};
                            }
                        }
                    ]
                };

                buildFormWithModal($scope, $modal, options);
            }
        });
    };
	
	$scope.activateBranch = function (account, repo, branch) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/gitAccounts/getBranches',
			params: {
				name: repo.full_name,
				type: 'repo',
				id: account._id.toString(),
				provider: account.provider
			}
		}, function (error, result) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				let git = {
					branches: []
				};
				let found;
				//check and compare branches
				//add the activated branch
				if (repo.git && repo.git.branches ){
					result.branches.forEach(function (oneBranch) {
						found = false;
						for (let i = 0; i < repo.git.branches.length; i++) {
							if(repo.git.branches[i].name === oneBranch.name){
								git.branches.push({
									name : oneBranch.name,
									active : repo.git.branches[i].active || branch === oneBranch.name
								});
								found = true;
								break;
							}
						}
						if (!found){
							git.branches.push({
								name : oneBranch.name,
								active : branch === oneBranch.name
							});
						}
					});
				}
				
				getSendDataFromServer($scope, ngDataApi, {
					method: 'post',
					routeName: '/dashboard/gitAccounts/repo/activate',
					params: {
						id: account._id.toString(),
						provider: account.provider
					},
					data: {
						provider: account.provider,
						owner: repo.owner.login,
						repo: repo.name,
						project: repo.project ? repo.project.key : null,
						configBranch: branch,
						git
					}
				}, function (error, response) {
					overlayLoading.hide();
					if (error) {
						var outerScope = $scope;
						var errorDisplay = $modal.open({
							templateUrl: 'errorDisplay.tmpl',
							backdrop: true,
							keyboard: true,
							controller: function ($scope) {
								fixBackDrop();
								
								$scope.title = translation.repoActivationFailed[LANG];
								
								$scope.error = error.message;
								if (error.code === 762){
									$scope.error = "Detected Service Name / Port mismatch for branch " + branch + ". Make sure the branch has the same Service Name / Port."
								}
								if($scope.error.indexOf("Error[999]") === -1){
									$scope.error += "<br>" + outerScope.referToDoc;
								}
								$scope.ok = function () {
									errorDisplay.close();
								}
							}
						});
					} else {
						repo.git = git;
						$scope.displayAlert('success', translation.repoHasBeenActivated[LANG]);
						repo.status = 'active';
						if (response.noApi){
							var outerScope = $scope;
							let noSwaggerFile = $modal.open({
								templateUrl: 'noSwagger.tmpl',
								backdrop: true,
								keyboard: true,
								controller: function ($scope) {
									fixBackDrop();
								
									$scope.title = translation.repoActivationSucceeded[LANG];
									$scope.error = translation.repoNoSwaggerFileDetected[LANG];
									if(response.reason && [983, 984, 985, 986].indexOf(response.reason) !== -1){
										$scope.error = "Your repository got turned on, you have a problem with the swagger file, you will not be able to browse and secure the API of this service"
									}
									$scope.error += "<br>" + outerScope.referToDoc;
									$scope.ok = function () {
										noSwaggerFile.close();
									}
								}
							});
						}
						if(response.type){
							repo.type = response.type;
						}
					}
				});
			}
		});
		
	};
    
    $scope.deactivateRepo = function (accountId, repo, branch) {
    	let opts = {
		    method: 'put',
		    routeName: '/dashboard/gitAccounts/repo/deactivate',
		    params: {
			    id: accountId.toString(),
			    owner: repo.owner.login,
			    repo: repo.name
		    }
	    };
    	if (branch){
		    opts.params.branch = branch;
	    }
        getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
            } else {
                $scope.displayAlert('success', translation.repoHasBeenDeactivated[LANG]);
                for (var i = 0; i < $scope.accounts.length; i++) {
                    if ($scope.accounts[i]._id === accountId) {
                        var account = $scope.accounts[i];
                        for (var j = 0; j < account.repos.length; j++) {
                            if (account.repos[j].full_name === repo.full_name) {
                            	if (branch){
                            		let active = false;
                            		if ( account.repos[j].git && account.repos[j].git.branches){
			                            account.repos[j].git.branches.forEach((oneBranch)=>{
			                            	if (oneBranch.name === branch){
					                            oneBranch.active = false;
				                            }
				                            if (oneBranch.active){
					                            active = true;
				                            }
			                            });
		                            }
		                            if (!active){
		                            	delete  account.repos[j].git;
			                            account.repos[j].status = '';
		                            }
	                            }
	                            else {
		                            delete  account.repos[j].git;
		                            account.repos[j].status = '';
	                            }
                            }
                        }
                    }
                }
            }
        });
    };

    $scope.syncRepo = function (account, repo, branch) {
        overlayLoading.show();
        let opsData = {
	        method: 'put',
	        routeName: '/dashboard/gitAccounts/repo/sync',
	        params: {
		        id: account._id.toString()
	        },
	        data: {
		        provider: account.provider,
		        project: repo.project ? repo.project.key : null,
		        owner: repo.owner.login,
		        repo: repo.name
	        }
        };
        if (branch){
	        opsData.data.branch = branch;
        }
        getSendDataFromServer($scope, ngDataApi, opsData, function (error, response) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            } else {
                if (response.status === 'upToDate') {
                    $scope.displayAlert('success', 'Repository is up to date');
                }
                else if (response.status === 'outOfSync') {
                    repo.status = 'outOfSync';
                    var outerScope = $scope;
                    var repoOutOfSync = $modal.open({
                        templateUrl: 'repoOutOfSync.tmpl',
                        backdrop: true,
                        keyboard: true,
                        controller: function ($scope) {
                            fixBackDrop();

                            $scope.reactivate = function () {
                                getSendDataFromServer($scope, ngDataApi, {
                                    method: 'put',
                                    routeName: '/dashboard/gitAccounts/repo/deactivate',
                                    params: {
                                        id: account._id.toString(),
                                        owner: repo.owner.login,
                                        repo: repo.name
                                    }
                                }, function (error) {
                                    if (error) {
                                        outerScope.displayAlert('danger', error.message);
                                        repoOutOfSync.close();
                                    } else {
                                        repoOutOfSync.close();
                                        outerScope.activateRepo(account, repo);
                                    }
                                });
                            };

                            $scope.cancel = function () {
                                repoOutOfSync.close();
                            };
                        }
                    });
                }
                else if (response.status === 'multiSyncDone'){
                    if (response.updated.length === 0 && response.removed.length === 0 && response.added.length === 0) {
                        $scope.displayAlert('success', 'Repository is up to date');
                    } else {
                        var syncSuccess = $modal.open({
                            templateUrl: 'syncSuccess.tmpl',
                            backdrop: true,
                            keyboard: true,
                            controller: function ($scope) {
                                fixBackDrop();
                                $scope.results = {
                                    updated: response.updated,
                                    added: response.added,
                                    removed: response.removed
                                };

                                $scope.ok = function () {
                                    syncSuccess.close();
                                }
                            }
                        });
                    }
                } else {
                    $scope.displayAlert('success', 'Repository has been synced');
                }
            }
        });
    };
	
	$scope.syncRepoBranches = function (account, repo) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/gitAccounts/repo/sync/branches',
			params: {
				id: account._id.toString(),
			},
			data: {
				name: repo.full_name,
				type: repo.type,
				provider: account.provider
			}
		}, function (error, result) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				repo.git = result.git;
			}
			
		});
	};

	$scope.configureRepo = function (oneRepo, gitAccount) {
		repoSrv.configureRepo($scope, oneRepo, gitAccount, gitAccountsAppConfig);
	};

	$scope.showHide = function (account) {
		if (!account.hide) {
			jQuery('#a_' + account._id + " .body .inner").slideUp();
			account.icon = 'plus';
			account.hide = true;
			// jQuery('#s_' + account._id + " .header").addClass("closed");
		}
		else {
			jQuery('#a_' + account._id + " .body .inner").slideDown();
			// jQuery('#s_' + account._id + " .header").removeClass("closed");
			account.icon = 'minus';
			account.hide = false;
		}
	};
	
	$scope.configureRepoEditor = false;
	
    injectFiles.injectCss("modules/dashboard/gitAccounts/gitAccounts.css");
    if ($scope.access.listAccounts) {
        $scope.listAccounts();
    }
}]);

gitAccountsApp.filter('reposSearchFilter', function() {
	return function(input, searchKeyword) {
		if(!searchKeyword) return input;
		if(!input || !Array.isArray(input) || input.length === 0) return input;

		var output = [];
		input.forEach(function(oneInput) {
			if(oneInput) {
                //using full_name since it's composed of owner + name
				if(oneInput.full_name && oneInput.full_name.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) {
					output.push(oneInput);
				}
			}
		});

		return output;
	}
});
