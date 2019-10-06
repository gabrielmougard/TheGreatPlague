// Add a custom menu to the active document, including a separator and a sub-menu.
function onOpen(e) {
  SpreadsheetApp.getUi()
      .createMenu('Epidemia')
      .addItem('setup epidemia', 'setupEpidemia')
      .addToUi();
}
function setupEpidemia() {
  var RANDOM_IMMUNE_FACTOR   = 0.5;
  var RANDOM_SICK_FACTOR     = 0.5;
  var nbSick                 = 0;
  var nbImmune               = 0;
  var dimension              = 0;
  var ui = SpreadsheetApp.getUi(); 
  var dimensionResult = ui.prompt(
      'Let\'s enter the dimension of the epidemia (must be an integer):',
      ui.ButtonSet.OK_CANCEL);
  // Process the user's response.
  var button = dimensionResult.getSelectedButton();
  dimension = parseInt(dimensionResult.getResponseText());
  if (button == ui.Button.OK) {
    var sickResult = ui.prompt(
      '(Optionnal, if you want to randomize it, click on "Cancel" or close the windows)Let\'s enter the number of sick people (must be an integer, less than '+dimension*dimension+'):',
      ui.ButtonSet.OK_CANCEL);
    var buttonSick = sickResult.getSelectedButton();
    nbSick = parseInt(sickResult.getResponseText()); 
    if (buttonSick != ui.Button.OK) { // cancel or closed
      nbSick = Math.floor(getRandomInt(1,dimension*dimension)*RANDOM_SICK_FACTOR);
    }
    var immuneResult = ui.prompt(
      '(Optionnal, if you want to randomize it, click on "Cancel" or close the windows)Let\'s enter the number of immune people (must be an integer, less than '+dimension*dimension+'):',
      ui.ButtonSet.OK_CANCEL);
    var buttonImmune = immuneResult.getSelectedButton();
    nbImmune = parseInt(immuneResult.getResponseText()); 
    if (buttonImmune != ui.Button.OK) { // cancel or closed
      nbImmune = Math.floor(getRandomInt(1,dimension*dimension)*RANDOM_IMMUNE_FACTOR);
    }
    generateMap(ui,dimension,nbSick,nbImmune);
   
    var startSimu = ui.alert(
     'Do you want to start the simulation ?',
      ui.ButtonSet.YES_NO);
    // Process the user's response.
    if (startSimu == ui.Button.YES) {
      
      
      var speed = ui.prompt(
        '(Optionnal, if cancel the speed will be fast) Choose the speed of the simulation (f/n/s) :fast/normal/slow :',
      ui.ButtonSet.OK_CANCEL);
      var buttonSpeed = speed.getSelectedButton();
      var speedResult = speed.getResponseText();
      if (buttonSpeed != ui.Button.OK) { // cancel or closed
        speedResult = 'n'; //normal
      }
      
      
      // User clicked "Yes".
      startEpidemia(ui,dimension,speedResult);
    } else {
      // User clicked "No" or X in the title bar.
      ui.alert('Good Bye !');
  }
  } else if (button == ui.Button.CANCEL) {
    // User clicked "Cancel".
    ui.alert('I didn\'t get the dimension, sorry.');
  } else if (button == ui.Button.CLOSE) {
    // User clicked X in the title bar.
    ui.alert('Goodbye !');
  }  
}
function generateMap(ui,dimension,nbSick,nbImmune) {
  var sheet = SpreadsheetApp.getActiveSheet();
  //var rightBoundary = getRightBoundary(dimension); // [1..26] ==> [A..Z] but after 26 its 'AA' , 'AB' etc...
  generateSickCells(sheet,dimension,nbSick);
  generateImmuneCells(sheet,dimension,nbImmune);
  coloration(sheet,dimension);
}
function startEpidemia(ui,dimension,speed) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = sheet.getRange(1,1,dimension,dimension);
  var values = range.getValues();
  
  
  var visited = []; //build the visited matrix
  for (var i = 0; i < values.length; i++) {
    visited[i] = new Array(dimension);
    for (var j = 0; j < values[0].length; j++) {
      if (values[i][j] == 0.0 || values[i][j] == 2.0) {
       visited[i][j] = true; 
      } else {
       visited[i][j] = false;
      }
    }
  }
  var newSicks = [];
  for (var i = 0; i < values.length; i++) {
    for (var j = 0; j < values[0].length; j++) {
      if (values[i][j] == 2.0) {
       newSicks.push([parseInt(i),parseInt(j)]);
      }
    }
  }
  
  var summary = move(sheet,dimension,values,visited,newSicks,0); //begin the epidemia at day 0

  //print the end message with some stats (contained in 'summary')
  //TODO : ...
  ui.alert('The Epidemia has last '+summary[0]+' day(s) and killed '+summary[1]+' people.');
  if (summary[2]) { //victory ?
    ui.alert('The Epidemia wiped out all the vulnerable people (not vaccined). Victory !');
  } else {
    ui.alert('A group of vulnerable people managed to survive ! Defeat !');
  }
  //
  
}


function move(sheet,dimension,values,visited,newSicks,days,speed) {
  
  var nextNewSicks = [];
  //updates values and visited
  for (var i = 0; i < newSicks.length; i++) {
    var pos = newSicks[i];
      console.log("NewSicks "+newSicks)
    var posNeighboors = boundaryConditions(pos,values,visited); //return the coord of the possible infected neighboors of pos (i.e : [[i1,j1], ... [ik,jk]]) . This is the function which is updating the 'visited' matrix.
    colorNeighboors(sheet,dimension,posNeighboors);
    SpreadsheetApp.flush();
    switch(speed) {
      case 's':
        Utilities.sleep(400);
        break;
      case 'n':
        Utilities.sleep(100);
        break;
      default: //mean fast or bullshit in the input
        break;
    }
    for (var j = 0; j < posNeighboors.length; j++) {
      nextNewSicks.push(posNeighboors[j]);
    }
  }
  
  if (nextNewSicks.length == 0) {
   //this is the stopping condition (epidemia is stopped because there are no new sick cases)
   // return the stats
    var nbSicksEnd = getNbSicksEnd(values); //TODO : code this function
    var isEpidemiaVictorious = isVictorious(values); //TODO : code this function
    var summary = []
    summary.push(days);
    summary.push(nbSicksEnd);
    summary.push(isEpidemiaVictorious);
    console.log(values);
    return summary;
  }
  
  //update values (insert the nextNewSicks)
  for (var i = 0; i < nextNewSicks.length; i++) {
   var nextNewSick = nextNewSicks[i];
   values[nextNewSick[0]][nextNewSick[1]] = 2.0;
  }
  
  
  //coloration 
  //colorationRec(sheet,dimension,values);
  //maybe add a timer here to see the steps
  //
  //recursion
  return move(sheet,dimension,values,visited,nextNewSicks,days+1,speed);
  
  
}
function boundaryConditions(position,values,visited) {
  var l = values.length-1
  var x = position[0];
  var y = position[1];
  var res = [];
  //first, the edge cases
  if (x == 0) { //first row
    if (y == 0) {
      if (!visited[x][y+1] && values[x][y+1] != 2.0) {
        visited[x][y+1] = true;
        res.push([x,y+1]);
      }
      if (!visited[x+1][y+1] && values[x+1][y+1] != 2.0) {
        visited[x+1][y+1] = true;
        res.push([x+1,y+1]);
      }
      if (!visited[x+1][y] && values[x+1][y] != 2.0) {
        visited[x+1][y] = true;
        res.push([x+1,y]);
      }
    }
    else if (y == l) {
      if (!visited[x][y-1] && values[x][y-1] != 2.0) {
        visited[x][y-1] = true;
        res.push([x,y-1]);
      }
      if (!visited[x+1][y-1] && values[x+1][y-1] != 2.0) {
        visited[x+1][y-1] = true;
        res.push([x+1,y-1]);
      }
      if (!visited[x+1][y] && values[x+1][y] != 2.0) {
        visited[x+1][y] = true;
        res.push([x+1,y]);
      }
    }
    else {
      if (!visited[x][y-1] && values[x][y-1] != 2.0) {
        visited[x][y-1] = true;
        res.push([x,y-1]);
      }
      if (!visited[x+1][y-1] && values[x+1][y-1] != 2.0) {
        visited[x+1][y-1] = true;
        res.push([x+1,y-1]);
      }
      if (!visited[x+1][y] && values[x+1][y] != 2.0) {
        visited[x+1][y] = true;
        res.push([x+1,y]);
      }
      if (!visited[x][y+1] && values[x][y+1] != 2.0) {
        visited[x][y+1] = true;
        res.push([x,y+1]);
      }
      if (!visited[x+1][y+1] && values[x+1][y+1] != 2.0) {
        visited[x+1][y+1] = true;
        res.push([x+1,y+1]);
      }
    }
  }
  else if (x == l) { // last row
    if (y == 0) {
      if (!visited[x-1][y] && values[x-1][y] != 2.0) {
        visited[x-1][y] = true;
        res.push([x-1,y]);
      }
      if (!visited[x-1][y+1] && values[x-1][y+1] != 2.0) {
        visited[x-1][y+1] = true;
        res.push([x-1,y+1]);
      }
      if (!visited[x][y+1] && values[x][y+1] != 2.0) {
        visited[x][y+1] = true;
        res.push([x,y+1]);
      }
    }
    else if (y == l) {
      if (!visited[x-1][y-1] && values[x-1][y-1] != 2.0) {
        visited[x-1][y-1] = true;
        res.push([x-1,y-1]);
      }
      if (!visited[x-1][y] && values[x-1][y] != 2.0) {
        visited[x-1][y] = true;
        res.push([x-1,y]);
      }
      if (!visited[x][y-1] && values[x][y-1] != 2.0) {
        visited[x][y-1] = true;
        res.push([x,y-1]);
      }
    }
    else {
      if (!visited[x-1][y-1] && values[x-1][y-1] != 2.0) {
        visited[x-1][y-1] = true;
        res.push([x-1,y-1]);
      }
      if (!visited[x-1][y] && values[x-1][y] != 2.0) {
        visited[x-1][y] = true;
        res.push([x-1,y]);
      }
      if (!visited[x][y-1] && values[x][y-1] != 2.0) {
        visited[x][y-1] = true;
        res.push([x,y-1]);
      }
      if (!visited[x-1][y+1] && values[x-1][y+1] != 2.0) {
        visited[x-1][y+1] = true;
        res.push([x-1,y+1]);
      }
      if (!visited[x][y+1] && values[x][y+1] != 2.0) {
        visited[x][y+1] = true;
        res.push([x,y+1]);
      }
    }
  }
  else {
    if (y == 0) {
      if (!visited[x+1][y] && values[x+1][y] != 2.0) {
        visited[x+1][y] = true;
        res.push([x+1,y]);
      }
      if (!visited[x-1][y] && values[x-1][y] != 2.0) {
        visited[x-1][y] = true;
        res.push([x-1,y]);
      }
      if (!visited[x+1][y+1] && values[x+1][y+1] != 2.0) {
        visited[x+1][y+1] = true;
        res.push([x+1,y+1]);
      }
      if (!visited[x-1][y+1] && values[x-1][y+1] != 2.0) {
        visited[x-1][y+1] = true;
        res.push([x-1,y+1]);
      }
      if (!visited[x][y+1] && values[x][y+1] != 2.0) {
        visited[x][y+1] = true;
        res.push([x,y+1]);
      }
    }
    else if (y == l) {
      if (!visited[x-1][y] && values[x-1][y] != 2.0) {
        visited[x-1][y] = true;
        res.push([x-1,y]);
      }
      if (!visited[x+1][y] && values[x+1][y] != 2.0) {
        visited[x+1][y] = true;
        res.push([x+1,y]);
      }
      if (!visited[x-1][y-1] && values[x-1][y-1] != 2.0) {
        visited[x-1][y-1] = true;
        res.push([x-1,y-1]);
      }
      if (!visited[x][y-1] && values[x][y-1] != 2.0) {
        visited[x][y-1] = true;
        res.push([x,y-1]);
      }
      if (!visited[x+1][y-1] && values[x+1][y-1] != 2.0) {
        visited[x+1][y-1] = true;
        res.push([x+1,y-1]);
      }
    }
    else {
      if (!visited[x+1][y] && values[x+1][y] != 2.0) {
        visited[x+1][y] = true;
        res.push([x+1,y]);
      }
      if (!visited[x-1][y] && values[x-1][y] != 2.0) {
        visited[x-1][y] = true;
        res.push([x-1,y]);
      }
      if (!visited[x+1][y+1] && values[x+1][y+1] != 2.0) {
        visited[x+1][y+1] = true;
        res.push([x+1,y+1]);
      }
      if (!visited[x-1][y+1] && values[x-1][y+1] != 2.0) {
        visited[x-1][y+1] = true;
        res.push([x-1,y+1]);
      }
      if (!visited[x][y+1] && values[x][y+1] != 2.0) {
        visited[x][y+1] = true;
        res.push([x,y+1]);
      }
      if (!visited[x-1][y-1] && values[x-1][y-1] != 2.0) {
        visited[x-1][y-1] = true;
        res.push([x-1,y-1]);
      }
      if (!visited[x][y-1] && values[x][y-1] != 2.0) {
        visited[x][y-1] = true;
        res.push([x,y-1]);
      }
      if (!visited[x+1][y-1] && values[x+1][y-1] != 2.0) {
        visited[x+1][y-1] = true;
        res.push([x+1,y-1]);
      }
    }
  }
  console.log(res+" for "+position);
  
  return res;
}
function generateSickCells(sheet,dimension,nbSick) {
  var range = sheet.getRange(1,1,dimension,dimension);
  var map = [];
  for (var i = 0; i < dimension; i++) {
    map[i] = new Array(dimension);
    for (var j = 0; j < dimension; j++) {
      map[i][j] = 1;
    }
  }
  var count = nbSick
  for (var i = 0; i < dimension; i++) {
    //fill the line with '2' from index 0 to index Math.ceil(sickRatio*dimension)-1
    for (var j = 0; j < Math.ceil(nbSick/dimension); j++) {
      if (count > 0) {
        map[i][j] = 2; 
        count -= 1;
      }
    }
    map[i] = shuffle(map[i]); //shuffle it
  }
  for (var i = 0; i < dimension; i++) {
    map = shuffle(map); // shuffle the order of the rows
  }
  range.setValues(map);
}
function generateImmuneCells(sheet,dimension,nbImmune) {
  var range = sheet.getRange(1,1,dimension,dimension);
  var values = range.getValues();
  var count = nbImmune
  for (var i = 0; i < dimension; i++) {
    //fill the line with '2' from index 0 to index Math.ceil(sickRatio*dimension)-1
    for (var j = 0; j < Math.ceil(nbImmune/dimension); j++) {
      if (count > 0) {
        if (values[i][j] == 1) {
          values[i][j] = 0; 
          count -= 1; 
        }
      }
    }
    values[i] = shuffle(values[i]); //shuffle it
  }
  for (var i = 0; i < dimension; i++) {
    values = shuffle(values); // shuffle the order of the rows
  }
  range.setValues(values);
}
function coloration(sheet,dimension) {
  var range = sheet.getRange(1,1,dimension,dimension);
  var values = range.getValues();
  var colors = [];
  for (var i = 0; i < values.length; i++) {
    colors[i] = new Array(dimension);
    for (var j = 0; j < values[0].length; j++) {
      var v = values[i][j];
      switch(v) {
        case 0.0:
          colors[i][j] = "blue";
          break;
        case 1.0:
          colors[i][j] = "yellow";
          break;
        case 2.0:
          colors[i][j] = "red";
          break;
      }
    }
  }
  range.setBackgroundColors(colors);
}

function colorationRec(sheet,dimension,values) {
  var range = sheet.getRange(1,1,dimension,dimension);
  var colors = [];
  for (var i = 0; i < values.length; i++) {
    colors[i] = new Array(dimension);
    for (var j = 0; j < values[0].length; j++) {
      var v = values[i][j];
      switch(v) {
        case 0.0:
          colors[i][j] = "blue";
          break;
        case 1.0:
          colors[i][j] = "yellow";
          break;
        case 2.0:
          colors[i][j] = "red";
          break;
      }
    }
  }
  range.setBackgroundColors(colors);
}

function colorNeighboors(sheet,dimension,newSicks) {
  for (var i = 0; i < newSicks.length; i++) {
    var range = sheet.getRange(newSicks[i][0]+1,newSicks[i][1]+1);
    range.setBackground("red")
    range.setValue(2);
  }
  
}

function getNbSicksEnd(values) {
  var count = 0;
  for (var i = 0; i < values.length; i++) {
    for (var j = 0; j < values[0].length; j++) {
      if (values[i][j] == 2) {
       count += 1; 
      }
    }
  }
  return count;
}

function isVictorious(values) {
  for (var i = 0; i < values.length; i++) {
    for (var j = 0; j < values[0].length; j++) {
      if (values[i][j] == 1) {
       return false; 
      }
    }
  }
  
  return true
}
/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
 /**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}






