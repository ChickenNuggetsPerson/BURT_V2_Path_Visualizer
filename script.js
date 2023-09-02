Array.prototype.insert = function ( index, ...items ) {
    this.splice( index, 0, ...items );
};
function sleep(ms) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('resolved');
      }, ms);
    });
}
function moveSquareTo(xPos, yPos, rotate, duration, linear) {
    const canvas = document.getElementById("map");
    
    let botXSize = ( 480 / 6 ) * ( robotSizeWidth / 24 );
    let botYSize = ( 480 / 6 ) * ( robotSizeLength / 24 );
    
    const square = document.querySelector(".square");
    square.style.setProperty("width", `${botXSize}px`)
    square.style.setProperty("height", `${botYSize}px`)

    // Get the canvas position relative to the page
    const canvasRect = canvas.getBoundingClientRect();

    // Calculate the top-left coordinates based on the canvas position and center position
    const x = canvasRect.x - ( botXSize / 2) + xPos
    const y = canvasRect.y - ( botYSize / 2) + yPos

    square.style.transition = `left ${duration}s, top ${duration}s, transform ${duration}s `;
    if (linear) {
        square.style.transitionTimingFunction = "linear"
    } else {
        square.style.transitionTimingFunction = "ease"
    }
    square.style.left = x + "px";
    square.style.top = y + "px";
    square.style.transform = `rotate(${rotate}deg)`;
}


let fieldImage = document.createElement("img")
fieldImage.src = "https://chickennuggetsperson.github.io/BURT_V2_Path_Visualizer/field.png"
let fileName = "path.json"


let robotSizeWidth = 15;
let robotSizeLength = 20;
let turnTime = 0.75
let tileSpeedPerSec = 1;

let NANValue = -1

// Type of movements
let movementTypes = [
    {
        name: "Delay",
        typeNum: 0,
        options: [{ type:"number", name:"Amount"}]
    },
    {
        name: "Drive Dist",
        typeNum: 1,
        options: [{ type:"number", name:"Distance"}]
    },
    {
        name: "Goto",
        typeNum: 2,
        options: [{ type:"position", name:"Position" }]
    },
    {
        name: "Long Goto",
        typeNum: 3,
        options: [{ type:"posArray", name:"Locations" }]
    },
    {
        name: "TurnTo",
        typeNum: 4,
        options: [{ type:"number", name:"Rotation" }]
    },
    {
        name: "Pickup Acorn",
        typeNum: 5,
        options: []
    },
    {
        name: "Dropoff Acorn",
        typeNum: 6,
        options: []
    },
    {
        name: "End",
        typeNum: -1,
        options: []
    },{
        name: "Reverse Drive",
        typeNum: 7,
        options: [{ type:"number", name:"Distance"}]
    }
]

function copyToClipboard(elem) {
    var target = elem;

    // select the content
    var currentFocus = document.activeElement;

    target.focus();
    target.setSelectionRange(0, target.value.length);

    // copy the selection
    var succeed;

    try {
      succeed = document.execCommand("copy");
    } catch (e) {
      console.warn(e);

      succeed = false;
    }

    // Restore original focus
    if (currentFocus && typeof currentFocus.focus === "function") {
      currentFocus.focus();
    }

    if (succeed) {
      $(".copied").animate({ top: -25, opacity: 0 }, 700, function() {
        $(this).css({ top: 0, opacity: 1 });
      });
    }

    return succeed;
}

$("#copyButton, #copyTarget").on("click", function() {
    copyToClipboard(document.getElementById("copyTarget"));
});


function createMovement(type, val, pos, isTilePos, drivePath) {
    return {
        type: type,
        val: val,
        pos: pos,
        tilePosition: pos,
        tilePosBool: isTilePos,
        drivePath: drivePath
    }
}
function createPos(x, y, rot) {
    return {
        x: x,
        y: y,
        rot: rot
    }
}

class Path {
    name = ""
    movements = []
    startPos = {
        x: 0,
        y: 0,
        rot: 0
    }

    constructor(name) {
        this.name = name;
        let c = document.getElementById("map")
        this.ctx = c.getContext("2d");
    }
    load(json) {
        
        if (!json.name || !json.movements || !json.startPos) {
            console.log("Missing Something")
        }
        this.reset()

        console.log("Loading Path")
        this.name = json.name;
        this.movements = json.movements
        if (!json.startPos) {
            this.startPos = createPos(0, 0, 0)
        } else {
            this.startPos = json.startPos
        }
        
        this.setStartPos()

        for (let i = 0; i < this.movements.length; i++) {
            this.movements[i].type = JSON.parse(this.movements[i].type)
        }

        this.movements.forEach(movement => {
            addMovementToList(movement)
        })

        document.getElementById("pathName").value = this.name
        document.getElementById("movementCount").innerText = this.movements.length
        document.getElementById("estTime").innerText = this.genEstTime()

        this.render()
        
        return true;
    }
    readJSON() {
        bootbox.prompt({
            title: 'Paste Path JSON',
            message: " ",
            inputType: "text",
            callback: function(result) {
                if (result != "") {
                    try {
                        if (!displayPath.load(JSON.parse(result))) {
                            $.notify("Could Not Load Path", "error");
                        }
                    } catch(err) {
                        console.log(err)
                        $.notify("Could Not Parse Input", "error");
                    }
                }
            }
        });
    }
    exportJSON() {
        let data = this.genJSON()
        bootbox.dialog({
            size: 'medium',
            inputType: "text",
            message: `<input id="exportText" class="form-control form-control-lg" type="text" placeholder="" value="" aria-label=".form-control-lg example">`,
            title: "Copy This JSON To File",
            value: data,
            buttons: {
                cancel: {
                  label: "Download",
                  className: "btn-success",
                  callback: function(result) {
                   
                    // Create a temporary URL for the Blob
                    const blob = new Blob([data], { type: 'application/json' });

                    const url = URL.createObjectURL(blob);

                    // Create a temporary <a> element to trigger the download
                    const downloadLink = document.createElement('a');
                    downloadLink.href = url;
                    downloadLink.download = fileName;
                    downloadLink.click();

                    // Clean up the temporary URL
                    URL.revokeObjectURL(url);
                  }
                },
                confirm: {
                  label: "Close",
                  className: "btn-primary",
                  callback: function(result) {}
                }
            },
            callback: function(result) {}
        });
        document.getElementById("exportText").value = data
    }
    genJSON() {
        return JSON.stringify({
            name: document.getElementById("pathName").value,
            startPos: this.startPos,
            length: this.movements.length,
            movements: this.movements
        })
    }
    reset() {
        this.name = ""
        this.movements = []
        this.startPos = {
            x: 0,
            y: 0,
            rot: 0
        }
        const sortableList = document.getElementById("builderList");
        while (sortableList.firstChild) {
            sortableList.removeChild(sortableList.firstChild);
        }
        configStorage = {}
        this.render();
    }
    genEstTime() {
        let currentPos = this.startPos

        let time = 0;

        this.movements.forEach(movement => {
            
            if (movement.type == -1) {
                // End
            }
            if (movement.type == 0) {
                // Delay
                time += movement.val;
            }
            if (movement.type == 1) {
                // Drive Dist
                let dist = movement.val / 24
                time += (dist / tileSpeedPerSec)
                currentPos = this.pointFromDist(currentPos, movement.val)
            }
            if (movement.type == 2) {
                // Goto
                let dist = this.distBetweenPoints(currentPos, movement.tilePosition)
                console.log(dist)
                time += (dist / tileSpeedPerSec)
                if (movement.tilePosition.rot != NANValue) {
                    time += turnTime
                }
                currentPos = movement.tilePosition
            }
            if (movement.type == 3) {
                // Long Goto
                movement.drivePath.forEach(move => {
                    let dist = this.distBetweenPoints(currentPos, move)
                    time += (dist / tileSpeedPerSec)
                    if (move.rot != NANValue) {
                        time += turnTime
                    }
                    currentPos = move
                })
            }
            if (movement.type == 4) {
                // Turn T0
                time += turnTime
                let newPos = currentPos;
                newPos.rot = movement.val                    
                currentPos = newPos
            }
            if (movement.type == 5) {
                // Pickup
            }
            if (movement.type == 6) {
                // Drop
            }
        })
        
        return Math.round(time * 100) / 100;
    }
    distBetweenPoints(pos1, pos2) {
        let deltaX = Math.abs(pos2.x - pos1.x)
        let deltaY = Math.abs(pos2.y - pos1.y)

        return Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2))

    }
    setStartPos() {
        document.getElementById("startX").value = this.startPos.x
        document.getElementById("startY").value = this.startPos.y
        document.getElementById("startRot").value = this.startPos.rot
    }
    updateStartPos() {
        this.startPos.x = parseInt(document.getElementById("startX").value)
        this.startPos.y = parseInt(document.getElementById("startY").value)
        this.startPos.rot = parseInt(document.getElementById("startRot").value) 
    }
    render() {
        console.log("Rendering")
        this.updateStartPos()
        this.movements = getMovements()
        document.getElementById("movementCount").innerText = this.movements.length
        document.getElementById("estTime").innerText = this.genEstTime() + "s"

        this.ctx.drawImage(fieldImage, 0, 0, 480, 480)

        let currentPos = this.startPos

        let lineWidth = 5;
        let color = "rgb(3, 248, 252)"
        this.movements.forEach(movement => {
            
            if (movement.type == -1) {
                // End
                let startPosRender = this.tilePosToPos(currentPos)
                this.ctx.strokeStyle = "lime"
                this.ctx.lineWidth = 5;
                this.ctx.beginPath();
                this.ctx.arc(startPosRender.x, startPosRender.y, 10, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
            if (movement.type == 0) {
                // Delay
            }
            if (movement.type == 1) {
                // Drive Dist
                this.drawLine(currentPos, this.pointFromDist(currentPos, movement.val), lineWidth, color, false)
                currentPos = this.pointFromDist(currentPos, movement.val)
            }
            if (movement.type == 2) {
                // Goto
                this.drawLine(currentPos, movement.tilePosition, lineWidth, color, false)
                currentPos = movement.tilePosition
            }
            if (movement.type == 3) {
                // Long Goto
                movement.drivePath.forEach(move => {
                    this.drawLine(currentPos, move, lineWidth, color, false)
                    currentPos = move
                })
            }
            if (movement.type == 4) {
                // Turn T0
                this.drawLine(currentPos, this.pointFromDist(currentPos, 5), 5, "purple", false)
                let newPos = currentPos;
                newPos.rot = movement.val                    
                currentPos = newPos
            }
            if (movement.type == 5) {
                // Pickup
            }
            if (movement.type == 6) {
                // Drop
            }
            if (movement.type == 7) {
                // Reverse Drive
                //let editedPos = currentPos
                //editedPos.rot = editedPos.rot + 180
                //this.drawLine(currentPos, this.pointFromDist(editedPos, movement.val), lineWidth, color, false)
                //currentPos = this.pointFromDist(editedPos, movement.val)
                //currentPos.rot = currentPos.rot + 180
            }
        })

        let startPosRender = this.tilePosToPos(this.startPos)
        this.ctx.strokeStyle = "magenta"
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.arc(startPosRender.x, startPosRender.y, 10, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.drawLine(this.startPos, this.pointFromDist(this.startPos, 7), 5, "magenta")

    }
    


    async playPath() {
        document.getElementById("playPathBtn").disabled = true
        this.render();
        
        let currentPos = this.startPos;
        this.moveRobot(currentPos, 2);
        await sleep(2500)

        for (const movement of this.movements) {
            let time = 0;
            
            if (movement.type == -1) {
                // End
            }
            if (movement.type == 0) {
                // Delay
                time = movement.val;
                await sleep(time * 1000)
            }
            if (movement.type == 1) {
                // Drive Dist
                let dist = movement.val / 24
                time = (dist / tileSpeedPerSec)
                currentPos = this.pointFromDist(currentPos, movement.val)
                this.moveRobot(currentPos, time, false)
                await sleep(time * 1000)
            }
            if (movement.type == 2) {
                // Goto
                let dist = this.distBetweenPoints(currentPos, movement.tilePosition)
                time = (dist / tileSpeedPerSec)
                this.moveRobot(createPos(movement.tilePosition.x, movement.tilePosition.y, currentPos.rot), time, false)
                await sleep(time * 1000)
                if (movement.tilePosition.rot != NANValue) {
                    this.moveRobot(movement.tilePosition, time, true)
                    await sleep(turnTime * 1000)
                }
                currentPos = movement.tilePosition
            }
            if (movement.type == 3) {
                // Long Goto
                for (const move of movement.drivePath) {
                    let dist = this.distBetweenPoints(currentPos, move)
                    time = (dist / tileSpeedPerSec)
                    this.moveRobot(createPos(move.x, move.y, currentPos.rot), time, true)
                    await sleep(time * 1000)
                    if (move.rot != NANValue) {
                        this.moveRobot(move, time, true)
                        await sleep(turnTime * 1000)
                    }
                    currentPos = move
                }
            }
            if (movement.type == 4) {
                // Turn T0
                time = turnTime
                let newPos = currentPos;
                newPos.rot = movement.val                    
                currentPos = newPos
                this.moveRobot(newPos, time, false)
                await sleep(time * 1000)
            }
            if (movement.type == 5) {
                // Pickup
            }
            if (movement.type == 6) {
                // Drop
            }

            
        }

        await sleep(2500)
        let randomPos = createPos(-50, -50, 999)
        randomPos.x = ( Math.random() - 0.5 ) * randomPos.x
        randomPos.y = ( Math.random() - 0.5 ) * randomPos.y
        randomPos.rot = ( Math.random() - 0.5 ) * randomPos.rot
        this.moveRobot(randomPos, 5, false)

        document.getElementById("playPathBtn").disabled = false
    }    

    moveRobot(pos, time, linear) {
        moveSquareTo(this.tilePosToPos(pos).x, this.tilePosToPos(pos).y, pos.rot, time, linear);
    }

    drawLine(pos1, pos2, penWidth, color, canvasPos) {
        this.ctx.beginPath()
        this.ctx.lineWidth = penWidth
        this.ctx.strokeStyle = color;

        let drawPos1 = pos1
        let drawPos2 = pos2

        if (!canvasPos) {
            drawPos1 = this.tilePosToPos(pos1)
            drawPos2 = this.tilePosToPos(pos2)
        }
        this.ctx.moveTo(drawPos1.x, drawPos1.y)
        this.ctx.lineTo(drawPos2.x, drawPos2.y, 10)

        this.ctx.stroke()
    };
    drawRectangle(pos, width, height, penWidth, color) {

        width = width * 3
        height = height * 3

        pos = this.tilePosToPos(pos)

        let rect = {
            TL: createPos(0, 0, 0),
            TR: createPos(0, 0, 0),
            BL: createPos(0, 0, 0),
            BR: createPos(0, 0, 0)
        }

        rect.TL = createPos(-(width / 2), (height / 2), 0);
        rect.TR = createPos((width / 2), (height / 2), 0);
        rect.BL = createPos(-(width / 2), -(height / 2), 0);
        rect.BR = createPos((width / 2), -(height / 2), 0);

        rect.TL = this.rotatePosAroundOrgin(rect.TL, pos.rot)
        rect.TR = this.rotatePosAroundOrgin(rect.TR, pos.rot)
        rect.BL = this.rotatePosAroundOrgin(rect.BL, pos.rot)
        rect.BR = this.rotatePosAroundOrgin(rect.BR, pos.rot)

        rect.TL = this.translatePos(rect.TL, pos.x, pos.y)
        rect.TR = this.translatePos(rect.TR, pos.x, pos.y)
        rect.BL = this.translatePos(rect.BL, pos.x, pos.y)
        rect.BR = this.translatePos(rect.BR, pos.x, pos.y)

        this.drawLine(rect.TL, rect.TR, penWidth, color, true);
        this.drawLine(rect.TR, rect.BR, penWidth, color, true);
        this.drawLine(rect.BR, rect.BL, penWidth, color, true);
        this.drawLine(rect.BL, rect.TL, penWidth, color, true);

    }
    translatePos(pos, deltaX, deltaY) {
        return createPos(pos.x + deltaX, pos.y + deltaY, pos.rot)
    }
    rotatePosAroundOrgin(pos, angle) {
        // Convert angle from degrees to radians
        const angleRadians = (angle * Math.PI) / 180;

        // Calculate the new coordinates after rotation
        const xNew = pos.x * Math.cos(angleRadians) - pos.y * Math.sin(angleRadians);
        const yNew = pos.x * Math.sin(angleRadians) + pos.y * Math.cos(angleRadians);

        // Return the new rotated point as an object
        return createPos(xNew, yNew, pos.rot);
    }

    tilePosToPos(tilePos) {
        return {
            x: (tilePos.x * 80) + (80 / 2),
            y: 400 - (tilePos.y * 80) + (80 / 2),
            rot: tilePos.rot
        }
    };
    pointFromDist(startPos, dist) {
        let correctDist = (dist / 24)
        let deg = this.degreeToRad(startPos.rot)
        
        let desiredX = startPos.x + correctDist * Math.cos(2.5*Math.PI - deg); 
        let desiredY = startPos.y + correctDist * Math.sin(2.5*Math.PI - deg);
    return createPos(desiredX, desiredY, startPos.rot);
    }

    degreeToRad(degree) {
        return degree * ( Math.PI / 180 );
      };
    radToDegree(rad) {
        return rad * ( 180 / Math.PI );
      };
      

}
let displayPath = new Path("test");





function resetSideBar() {
    let pickList = document.getElementById("sideBarList")
    pickList.innerHTML = ""
    movementTypes.forEach(type => {
        let tmp = document.createElement("li")

        let card = document.createElement('div')
        card.classList.add("card")
        let cardBody = document.createElement("div")
        cardBody.classList.add("card-body")

        cardBody.innerText = type.name


        let div = document.createElement('div')
        div.innerHTML = `<svg fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 50 50" width="50px" height="50px"><path d="M 22.205078 2 A 1.0001 1.0001 0 0 0 21.21875 2.8378906 L 20.246094 8.7929688 C 19.076509 9.1331971 17.961243 9.5922728 16.910156 10.164062 L 11.996094 6.6542969 A 1.0001 1.0001 0 0 0 10.708984 6.7597656 L 6.8183594 10.646484 A 1.0001 1.0001 0 0 0 6.7070312 11.927734 L 10.164062 16.873047 C 9.583454 17.930271 9.1142098 19.051824 8.765625 20.232422 L 2.8359375 21.21875 A 1.0001 1.0001 0 0 0 2.0019531 22.205078 L 2.0019531 27.705078 A 1.0001 1.0001 0 0 0 2.8261719 28.691406 L 8.7597656 29.742188 C 9.1064607 30.920739 9.5727226 32.043065 10.154297 33.101562 L 6.6542969 37.998047 A 1.0001 1.0001 0 0 0 6.7597656 39.285156 L 10.648438 43.175781 A 1.0001 1.0001 0 0 0 11.927734 43.289062 L 16.882812 39.820312 C 17.936999 40.39548 19.054994 40.857928 20.228516 41.201172 L 21.21875 47.164062 A 1.0001 1.0001 0 0 0 22.205078 48 L 27.705078 48 A 1.0001 1.0001 0 0 0 28.691406 47.173828 L 29.751953 41.1875 C 30.920633 40.838997 32.033372 40.369697 33.082031 39.791016 L 38.070312 43.291016 A 1.0001 1.0001 0 0 0 39.351562 43.179688 L 43.240234 39.287109 A 1.0001 1.0001 0 0 0 43.34375 37.996094 L 39.787109 33.058594 C 40.355783 32.014958 40.813915 30.908875 41.154297 29.748047 L 47.171875 28.693359 A 1.0001 1.0001 0 0 0 47.998047 27.707031 L 47.998047 22.207031 A 1.0001 1.0001 0 0 0 47.160156 21.220703 L 41.152344 20.238281 C 40.80968 19.078827 40.350281 17.974723 39.78125 16.931641 L 43.289062 11.933594 A 1.0001 1.0001 0 0 0 43.177734 10.652344 L 39.287109 6.7636719 A 1.0001 1.0001 0 0 0 37.996094 6.6601562 L 33.072266 10.201172 C 32.023186 9.6248101 30.909713 9.1579916 29.738281 8.8125 L 28.691406 2.828125 A 1.0001 1.0001 0 0 0 27.705078 2 L 22.205078 2 z M 23.056641 4 L 26.865234 4 L 27.861328 9.6855469 A 1.0001 1.0001 0 0 0 28.603516 10.484375 C 30.066026 10.848832 31.439607 11.426549 32.693359 12.185547 A 1.0001 1.0001 0 0 0 33.794922 12.142578 L 38.474609 8.7792969 L 41.167969 11.472656 L 37.835938 16.220703 A 1.0001 1.0001 0 0 0 37.796875 17.310547 C 38.548366 18.561471 39.118333 19.926379 39.482422 21.380859 A 1.0001 1.0001 0 0 0 40.291016 22.125 L 45.998047 23.058594 L 45.998047 26.867188 L 40.279297 27.871094 A 1.0001 1.0001 0 0 0 39.482422 28.617188 C 39.122545 30.069817 38.552234 31.434687 37.800781 32.685547 A 1.0001 1.0001 0 0 0 37.845703 33.785156 L 41.224609 38.474609 L 38.53125 41.169922 L 33.791016 37.84375 A 1.0001 1.0001 0 0 0 32.697266 37.808594 C 31.44975 38.567585 30.074755 39.148028 28.617188 39.517578 A 1.0001 1.0001 0 0 0 27.876953 40.3125 L 26.867188 46 L 23.052734 46 L 22.111328 40.337891 A 1.0001 1.0001 0 0 0 21.365234 39.53125 C 19.90185 39.170557 18.522094 38.59371 17.259766 37.835938 A 1.0001 1.0001 0 0 0 16.171875 37.875 L 11.46875 41.169922 L 8.7734375 38.470703 L 12.097656 33.824219 A 1.0001 1.0001 0 0 0 12.138672 32.724609 C 11.372652 31.458855 10.793319 30.079213 10.427734 28.609375 A 1.0001 1.0001 0 0 0 9.6328125 27.867188 L 4.0019531 26.867188 L 4.0019531 23.052734 L 9.6289062 22.117188 A 1.0001 1.0001 0 0 0 10.435547 21.373047 C 10.804273 19.898143 11.383325 18.518729 12.146484 17.255859 A 1.0001 1.0001 0 0 0 12.111328 16.164062 L 8.8261719 11.46875 L 11.523438 8.7734375 L 16.185547 12.105469 A 1.0001 1.0001 0 0 0 17.28125 12.148438 C 18.536908 11.394293 19.919867 10.822081 21.384766 10.462891 A 1.0001 1.0001 0 0 0 22.132812 9.6523438 L 23.056641 4 z M 25 17 C 20.593567 17 17 20.593567 17 25 C 17 29.406433 20.593567 33 25 33 C 29.406433 33 33 29.406433 33 25 C 33 20.593567 29.406433 17 25 17 z M 25 19 C 28.325553 19 31 21.674447 31 25 C 31 28.325553 28.325553 31 25 31 C 21.674447 31 19 28.325553 19 25 C 19 21.674447 21.674447 19 25 19 z"/></svg>`
        div.style.display = "none"
        div.style.float = "right"
        

        tmp.appendChild(div)


        tmp.setAttribute("type", type.typeNum)
        tmp.setAttribute("options", JSON.stringify(type.options))
        try {
            tmp.setAttribute("optionType", type.options[0].type)
            tmp.setAttribute("optionName", type.options[0].name)
        } catch(err) {

        }
    
        card.appendChild(cardBody)
        tmp.appendChild(card)
        pickList.appendChild(tmp)
    })
}
function buildPage() {
    resetSideBar()
}
new Sortable(document.getElementById("sideBarList"), {
    group: {
        name: 'shared',
        pull: 'clone',
        put: false // Do not allow items to be put into this list
    },
    animation: 150,
    sort: false // To disable sorting: set sort to false
});

let buildingList = new Sortable(document.getElementById("builderList"), {
    group: 'shared',
    animation: 150,
    onSort: function(event) {
        displayPath.render();
    },
    onAdd: function(event) {
        let options = JSON.parse(event.item.getAttribute("options"))
        if (options.length == 0) { return; }


        let gear = event.item.querySelectorAll('div')


        gear[0].style.display = "inline"

        let id = Math.random()
        event.item.setAttribute("configID", id)
        createConfig(id, options[0], event.item.getAttribute("optionName"))
        gear[0].onclick = function() {
            editConfig(id)
        }

    }
});


new Sortable(document.getElementById("trashList"), {
    group: 'shared',
    animation: 150,
    onSort: function(event) {
        event.item.remove()
    }

});



function getMoveType(movement) {
    return movementTypes.find(o => o.typeNum === movement.type);
}
function addMovementToList(movement) {
    buildingList.option("disabled", true);

    let buildList = document.getElementById("builderList")
    let type = getMoveType(movement)
    console.log(movement)


    let tmp = document.createElement("li")

    let card = document.createElement('div')
    card.classList.add("card")
    let cardBody = document.createElement("div")
    cardBody.classList.add("card-body")

    cardBody.innerText = type.name


    let div = document.createElement('div')
    div.innerHTML = `<svg fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 50 50" width="50px" height="50px"><path d="M 22.205078 2 A 1.0001 1.0001 0 0 0 21.21875 2.8378906 L 20.246094 8.7929688 C 19.076509 9.1331971 17.961243 9.5922728 16.910156 10.164062 L 11.996094 6.6542969 A 1.0001 1.0001 0 0 0 10.708984 6.7597656 L 6.8183594 10.646484 A 1.0001 1.0001 0 0 0 6.7070312 11.927734 L 10.164062 16.873047 C 9.583454 17.930271 9.1142098 19.051824 8.765625 20.232422 L 2.8359375 21.21875 A 1.0001 1.0001 0 0 0 2.0019531 22.205078 L 2.0019531 27.705078 A 1.0001 1.0001 0 0 0 2.8261719 28.691406 L 8.7597656 29.742188 C 9.1064607 30.920739 9.5727226 32.043065 10.154297 33.101562 L 6.6542969 37.998047 A 1.0001 1.0001 0 0 0 6.7597656 39.285156 L 10.648438 43.175781 A 1.0001 1.0001 0 0 0 11.927734 43.289062 L 16.882812 39.820312 C 17.936999 40.39548 19.054994 40.857928 20.228516 41.201172 L 21.21875 47.164062 A 1.0001 1.0001 0 0 0 22.205078 48 L 27.705078 48 A 1.0001 1.0001 0 0 0 28.691406 47.173828 L 29.751953 41.1875 C 30.920633 40.838997 32.033372 40.369697 33.082031 39.791016 L 38.070312 43.291016 A 1.0001 1.0001 0 0 0 39.351562 43.179688 L 43.240234 39.287109 A 1.0001 1.0001 0 0 0 43.34375 37.996094 L 39.787109 33.058594 C 40.355783 32.014958 40.813915 30.908875 41.154297 29.748047 L 47.171875 28.693359 A 1.0001 1.0001 0 0 0 47.998047 27.707031 L 47.998047 22.207031 A 1.0001 1.0001 0 0 0 47.160156 21.220703 L 41.152344 20.238281 C 40.80968 19.078827 40.350281 17.974723 39.78125 16.931641 L 43.289062 11.933594 A 1.0001 1.0001 0 0 0 43.177734 10.652344 L 39.287109 6.7636719 A 1.0001 1.0001 0 0 0 37.996094 6.6601562 L 33.072266 10.201172 C 32.023186 9.6248101 30.909713 9.1579916 29.738281 8.8125 L 28.691406 2.828125 A 1.0001 1.0001 0 0 0 27.705078 2 L 22.205078 2 z M 23.056641 4 L 26.865234 4 L 27.861328 9.6855469 A 1.0001 1.0001 0 0 0 28.603516 10.484375 C 30.066026 10.848832 31.439607 11.426549 32.693359 12.185547 A 1.0001 1.0001 0 0 0 33.794922 12.142578 L 38.474609 8.7792969 L 41.167969 11.472656 L 37.835938 16.220703 A 1.0001 1.0001 0 0 0 37.796875 17.310547 C 38.548366 18.561471 39.118333 19.926379 39.482422 21.380859 A 1.0001 1.0001 0 0 0 40.291016 22.125 L 45.998047 23.058594 L 45.998047 26.867188 L 40.279297 27.871094 A 1.0001 1.0001 0 0 0 39.482422 28.617188 C 39.122545 30.069817 38.552234 31.434687 37.800781 32.685547 A 1.0001 1.0001 0 0 0 37.845703 33.785156 L 41.224609 38.474609 L 38.53125 41.169922 L 33.791016 37.84375 A 1.0001 1.0001 0 0 0 32.697266 37.808594 C 31.44975 38.567585 30.074755 39.148028 28.617188 39.517578 A 1.0001 1.0001 0 0 0 27.876953 40.3125 L 26.867188 46 L 23.052734 46 L 22.111328 40.337891 A 1.0001 1.0001 0 0 0 21.365234 39.53125 C 19.90185 39.170557 18.522094 38.59371 17.259766 37.835938 A 1.0001 1.0001 0 0 0 16.171875 37.875 L 11.46875 41.169922 L 8.7734375 38.470703 L 12.097656 33.824219 A 1.0001 1.0001 0 0 0 12.138672 32.724609 C 11.372652 31.458855 10.793319 30.079213 10.427734 28.609375 A 1.0001 1.0001 0 0 0 9.6328125 27.867188 L 4.0019531 26.867188 L 4.0019531 23.052734 L 9.6289062 22.117188 A 1.0001 1.0001 0 0 0 10.435547 21.373047 C 10.804273 19.898143 11.383325 18.518729 12.146484 17.255859 A 1.0001 1.0001 0 0 0 12.111328 16.164062 L 8.8261719 11.46875 L 11.523438 8.7734375 L 16.185547 12.105469 A 1.0001 1.0001 0 0 0 17.28125 12.148438 C 18.536908 11.394293 19.919867 10.822081 21.384766 10.462891 A 1.0001 1.0001 0 0 0 22.132812 9.6523438 L 23.056641 4 z M 25 17 C 20.593567 17 17 20.593567 17 25 C 17 29.406433 20.593567 33 25 33 C 29.406433 33 33 29.406433 33 25 C 33 20.593567 29.406433 17 25 17 z M 25 19 C 28.325553 19 31 21.674447 31 25 C 31 28.325553 28.325553 31 25 31 C 21.674447 31 19 28.325553 19 25 C 19 21.674447 21.674447 19 25 19 z"/></svg>`
    div.style.display = "none"
    div.style.float = "right"
    

    tmp.appendChild(div)


    tmp.setAttribute("type", type.typeNum)
    tmp.setAttribute("options", JSON.stringify(type.options))
    try {
        tmp.setAttribute("optionType", type.options[0].type)
        tmp.setAttribute("optionName", type.options[0].name)


        let options = JSON.parse(tmp.getAttribute("options"))
        if (options.length == 0) { return; }


        let gear = tmp.querySelectorAll('div')


        gear[0].style.display = "inline"

        let id = Math.random()
        tmp.setAttribute("configID", id)
        createConfig(id, options[0], tmp.getAttribute("optionName"))
        gear[0].onclick = function() {
            editConfig(id)
        }
        loadConfig(id, movement)
    } catch(err) {

    }

    card.appendChild(cardBody)
    tmp.appendChild(card)
    buildList.appendChild(tmp)

    buildingList.option("disabled", false);
}


let configStorage = {}
function createConfig(id, config, configName) {
    if (config.type == "number") {
        configStorage[id] = {
            type: "number",
            name: configName,
            value: 0
        }
    }
    if (config.type == "position") {
        configStorage[id] = {
            type: "position",
            name: configName,
            value: {
                x: 0,
                y: 0,
                rot: 0
            }
        }
    }
    if (config.type == "posArray") {
        configStorage[id] = {
            type: "posArray",
            name: configName,
            value: [createPos(0, 0, NANValue)]
        }
    }
}
function getConfig(id) {
    return configStorage[id]
}
function changeConfig(id, newVal) {
    configStorage[id].value = newVal
    displayPath.render()
}
function loadConfig(id, movement) {
    let config = configStorage[id]

    if (config.type == "number") {
        changeConfig(id, movement.val)
    }
    if (config.type == "position") {
        changeConfig(id, movement.tilePosition)
    }
    if (config.type == "posArray") {
        changeConfig(id, movement.drivePath)
    }
}
function getMovements() {
    let list = document.getElementById("builderList")
    let items = list.querySelectorAll('li')
    let movements = []
    items.forEach(item => {

        let val = 0;
        let pos = { x: 0, y:0 , rot:NaN }
        let tilePosBool = true;
        let drivePath = []


        if (item.getAttribute("optionType") == "number") {
            val = getConfig(item.getAttribute("configID")).value
        }
        if (item.getAttribute("optionType") == "position") {
            pos = getConfig(item.getAttribute("configID")).value
        }
        if (item.getAttribute("optionType") == "posArray") {
            drivePath = getConfig(item.getAttribute("configID")).value
        }

        movements.push(createMovement(JSON.parse(item.getAttribute("type")), val, pos, tilePosBool, drivePath))
    })
    
    return movements

}
function editConfig(id) {
    console.log(id)
    let config = configStorage[id]
    console.log(config)

    if (config.type == "number") {

        bootbox.prompt({
            size: 'small',
            inputType: "number",
            title: config.name,
            value: JSON.stringify(config.value),
            callback: function(result) {
                changeConfig(id, JSON.parse(result))
            }
        });
    }
    if (config.type == "position") {
        
        let form = $(`
        <div class="input-group mb-3">
            <div class="input-group-prepend">
                <span class="input-group-text" id="basic-addon3">X Position</span>
            </div>
            <input type="number" class="form-control" name="xPos" aria-describedby="basic-addon3" value=${config.value.x}>    
        </div>    
        <div class="input-group mb-3">
            <div class="input-group-prepend">
                <span class="input-group-text" id="basic-addon3">Y Position</span>
            </div>
            <input type="number" class="form-control" name="yPos" aria-describedby="basic-addon3" value=${config.value.y}>
        </div>
        <div class="input-group mb-3">
            <div class="input-group-prepend">
                <span class="input-group-text" id="basic-addon3">Rotation</span>
            </div>
            <input type="number" class="form-control" name="rot" aria-describedby="basic-addon3" value=${config.value.rot}>
        </div>
        <div class="input-group mb-3">
            <div class="input-group-prepend">
                <span class="input-group-text" id="basic-addon3">Enter ${NANValue} for Null Rotation</span>
            </div>
            <h8>Null rotation means there will be no TurnTo at the end of the movement</h8>
        </div>
        `);
        bootbox.alert(form, function(){
            let newPos = {
                x: JSON.parse(form.find('input[name=xPos]').val()),
                y: JSON.parse(form.find('input[name=yPos]').val()),
                rot: JSON.parse(form.find('input[name=rot]').val())
            }
            changeConfig(id, newPos)
        });
        
    }
    if (config.type == "posArray") {
        bootbox.prompt({
            title: "Enter Position Array",
            message: `Enter a ${NANValue} rotation in the last movment if you don't want a TurnTo called`,
            inputType: 'textarea',
            value: js_beautify(JSON.stringify(config.value)),
            callback: function (result) {
                try {
                    let newData = JSON.parse(result)
                    changeConfig(id, JSON.parse(result))
                    console.log(newData);
                    console.log(result)
                    console.log(JSON.parse(result))
                } catch(err) {
                    console.log(err)
                    $.notify("Could Not Parse Input", "error");
                }
                
            }
        });
    }


    
}


function handleFileSelect(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    fileName = file.name;

    reader.onload = function(event) {
        const jsonContent = event.target.result;
        const jsonData = JSON.parse(jsonContent);
        console.log(jsonData); // Do something with the JSON data
        displayPath.load(jsonData)
    };

    reader.readAsText(file);
}


fieldImage.onload = function() {
    displayPath.render()
    buildPage()
}





