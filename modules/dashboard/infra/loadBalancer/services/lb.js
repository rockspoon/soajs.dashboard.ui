"use strict";
var infraLoadBalancerSrv = soajsApp.components;
infraLoadBalancerSrv.service('infraLoadBalancerSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $localStorage, $timeout, $modal, $window, $cookies, Upload) {
	
	function addLoadBalancer(currentScope) {
	}
	
	function editLoadBalancer(currentScope, oneLoadBalancer) {
	}
	
	function deleteLoadBalancer(currentScope, oneLoadBalancer) {
		
		let deleteFireWallOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'loadBalancer',
				'group': currentScope.selectedGroup.name,
				'name': oneLoadBalancer.name
			}
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteFireWallOpts, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The load balancer has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listLoadBalancers(currentScope, currentScope.selectedGroup);
				}, 2000);
			}
		});
	}

	function listLoadBalancers(currentScope, oneGroup) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected group in scope to be accessed by other functions
		currentScope.selectedGroup = oneGroup;

		// clean grid from previous list if any
		if (currentScope.grid && currentScope.grid.rows && currentScope.grid.filteredRows && currentScope.grid.original) {
			currentScope.grid.rows = [];
			currentScope.grid.filteredRows = [];
			currentScope.grid.original = [];
		}

		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': oneInfra._id,
				'group': oneGroup.name,
				'extras[]': ['loadBalancers']
			}
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraLoadBalancers = [];
				if (response.loadBalancers && response.loadBalancers.length > 0) {
					currentScope.infraLoadBalancers = response.loadBalancers;
					currentScope.infraLoadBalancers[0].open = true;
					
					currentScope.infraLoadBalancers.forEach((oneLoadBalancer) => {
						if(oneLoadBalancer.rules){
							oneLoadBalancer.rules[0].open = true;
						}
					});
				}
				
				if (currentScope.vmlayers) {
					let processedNetworks = [];
					currentScope.infraLoadBalancers.forEach((oneLoadBalancer) => {
						
						oneLoadBalancer.rules.forEach((oneRule) => {
							if(oneRule.config.subnet){
								
								currentScope.vmlayers.forEach((oneVmLayer) => {
									if (
										oneVmLayer.layer.toLowerCase() === oneRule.config.subnet.name.toLowerCase() &&
										oneVmLayer.network.toLowerCase() === oneRule.config.subnet.network.toLowerCase() &&
										oneVmLayer.labels &&
										oneVmLayer.labels['soajs.service.vm.group'].toLowerCase() === oneRule.config.subnet.group.toLowerCase() &&
										oneVmLayer.labels['soajs.env.code']
									) {
										$localStorage.environments.forEach((oneEnv) => {
											if (oneEnv.code.toUpperCase() === oneVmLayer.labels['soajs.env.code'].toUpperCase()) {
												oneRule.config.subnet.envCode = oneVmLayer.labels['soajs.env.code'];
											}
										});
									}
								});
							}
						});
					});
				}
			}
		});
		
	}
	
	return {
		'addLoadBalancer': addLoadBalancer,
		'editLoadBalancer': editLoadBalancer,
		'deleteLoadBalancer': deleteLoadBalancer,
		'listLoadBalancers': listLoadBalancers
	};
}]);
