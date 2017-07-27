// Class that wraps default Tab class
function TabWrapper(tab) {
  this.tab = tab;
  this.time_created = Date.now();
  this.time_last_active = Date.now();
  console.log("\tNEW TAB CREATED: " + this.tab.id + ", created: " + this.time_created + ", last active: " + this.time_last_active);

  this.madeActive = function() {
    this.time_last_active = Date.now();
    console.log("\tTAB " + this.tab.id + ", made active: " + this.time_last_active);
  };
}
