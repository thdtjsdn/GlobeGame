/*******************************************************************************
 #      ____               __          __  _      _____ _       _               #
 #     / __ \              \ \        / / | |    / ____| |     | |              #
 #    | |  | |_ __   ___ _ __ \  /\  / /__| |__ | |  __| | ___ | |__   ___      #
 #    | |  | | '_ \ / _ \ '_ \ \/  \/ / _ \ '_ \| | |_ | |/ _ \| '_ \ / _ \     #
 #    | |__| | |_) |  __/ | | \  /\  /  __/ |_) | |__| | | (_) | |_) |  __/     #
 #     \____/| .__/ \___|_| |_|\/  \/ \___|_.__/ \_____|_|\___/|_.__/ \___|     #
 #           | |                                                                #
 #           |_|                 _____ _____  _  __                             #
 #                              / ____|  __ \| |/ /                             #
 #                             | (___ | |  | | ' /                              #
 #                              \___ \| |  | |  <                               #
 #                              ____) | |__| | . \                              #
 #                             |_____/|_____/|_|\_\                             #
 #                                                                              #
 #                              (c) 2011-2012 by                                #
 #           University of Applied Sciences Northwestern Switzerland            #
 #                     Institute of Geomatics Engineering                       #
 #                          Author:robert.wst@gmail.com                         #
 ********************************************************************************
 *     Licensed under MIT License. Read the file LICENSE for more information   *
 *******************************************************************************/
goog.provide('owg.gg.PickingChallenge');

goog.require('owg.gg.Challenge');
goog.require('owg.gg.Button01');
goog.require('owg.gg.FlyingText');
goog.require('owg.gg.ScreenText');
goog.require('owg.gg.Clock');
goog.require('owg.gg.Pin');
//-----------------------------------------------------------------------------
/**
 * @class PickingChallenge
 * @constructor
 *
 * @description pick location challenge
 *
 * @author Robert Wüest robert.wst@gmail.ch
 *
 * @param {number} baseScore
 * @param {string} title
 * @param {Array.<number>} pos
 *
 */
function PickingChallenge(baseScore, title, pos)
{
    this.screenText = null;
    this.baseScore = baseScore;
    this.text = title;
    var that = this;
    this.flystate = false;
    this.zoomState = false;
    this.pickPos = [null, 0,0,0];
    this.solutionPos = pos;
    this.posPin = null;
    this.resultPin = null;
    this.line = null;
    this.distancText = null;
    this.okayBtn = null;
    this.pickOverlay = null;
    this.mouseLock = false;
    this.clock = null;
    this.ogFrameLayer = null;
    this.distanceLine = null;

    /* Inline functions */
    //-----------------------------------------------------------------------------
    /**
     * @description ok okay button event
     */
    this.OnOkay = function()
    {
        var scene = ogGetScene(m_context);
        var cartesian = ogToCartesian(scene, that.solutionPos[0],that.solutionPos[1],that.solutionPos[2]);
        var screenPos = ogWorldToWindow(scene,cartesian[0],cartesian[1],cartesian[2]);
        var distance = ogCalcDistanceWGS84(that.solutionPos[0], that.solutionPos[1], that.pickPos[1], that.pickPos[2]);
        distance = Math.round((distance/1000)*Math.pow(10,1))/Math.pow(10,1);
        that.resultPin.SetPos(screenPos[0], screenPos[1]);
        m_sounds["ping1"].play();
        if(that.posPin)
        {
            that.distanceLine = new Kinetic.Shape({drawFunc:function(){
                var ctx = this.getContext();
                ctx.moveTo(screenPos[0], screenPos[1]);
                ctx.lineTo(that.posPin.x, that.posPin.y);
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#DD6600";
                ctx.stroke();
                ctx.textAlign = "center";
                ctx.fillStyle = "#FF0";
                ctx.font = "16pt TitanOne";
                ctx.textAlign = "left";
                ctx.fillText(distance+"km", screenPos[0], screenPos[1]);
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#000"; // stroke color
                ctx.strokeText(distance+"km", screenPos[0], screenPos[1]);

            }});
            m_ui.add(that.distanceLine);
        }
        if(m_player)
        {
            if(distance < 50.0)
            {
                var score = 0;
                m_player.ScorePoints(Math.floor((that.baseScore/50.0)*(50.0-distance)),m_locale["estimation"]); score +=Math.floor((that.baseScore/50.0)*(50.0-distance));
                m_player.ScorePoints(Math.floor(that.clock.seconds/5), m_locale["timebonus"]);score += Math.floor(that.clock.seconds/5);
                if(that.clock.seconds > 50)
                {
                    m_player.ScorePoints(20, m_locale["speedbonus"]);score+=20;
                }
                Timeout(function(){
                    var coins = new Coins(m_ui, score);
                }, 1000);
            }
        }
        setTimeout(function(){
            that.callback();
        }, 2500);
    };
    //-----------------------------------------------------------------------------
    /**
     * @description mouse over okay button
     */
    this.MouseOverOkBtn = function()
    {
        that.mouseLock = true;
    };
    //-----------------------------------------------------------------------------
    /**
     * @description mouse out okay button
     */
    this.MouseOutOkBtn = function()
    {
        that.mouseLock = false;
    };
    //-----------------------------------------------------------------------------
    /**
     * @description mouse down on map
     */
    this.OnMouseDown = function()
    {
        if(that.mouseLock == false)
        {
            var pos = m_stage.getMousePosition();
            var scene = ogGetScene(m_context);
            if(that.posPin)
                that.posPin.SetPos(pos.x, pos.y);
            if(that.flystate == true)
            {
                ogStopFlyTo(scene);
            }
            var ori = ogGetOrientation(scene);
            var result = ogPickGlobe(scene, pos.x, pos.y);
            that.ZoomIn(result, ori);
            m_sounds["swoosh"].play();
            if(that.posPin == null)
            {
                that.posPin = new Pin(m_ui, m_images["pin_blue"], pos.x, pos.y);
            }
            that.zoomState = true;
        }
    };
    //-----------------------------------------------------------------------------
    /**
     * @description mouse up on map
     */
    this.OnMouseUp = function()
    {
        if(that.mouseLock == false)
        {
            var scene = ogGetScene(m_context);
            that.zoomState = false;
            var pos = m_stage.getMousePosition();
            var mx = pos.x-10;
            var my = pos.y-10;
            that.pickPos = ogPickGlobe(scene, pos.x, pos.y);
            m_sounds["pick"].play();
            if(that.posPin != null)
                that.posPin.SetVisible(false);
            if(that.flystate == true)
            {
                ogStopFlyTo(scene);
            }

            that.ZoomOut();
        }
    };
    //-----------------------------------------------------------------------------
    /**
     * @description mouse move over map
     */
    this.OnMouseMove = function()
    {
        if(that.zoomState == true)
        {
            var pos = m_stage.getMousePosition();
            if(that.posPin != null)
                that.posPin.SetPos(pos.x, pos.y);
        }
    };
    //-----------------------------------------------------------------------------
    /**
     * @description camera flight callback function
     */
    this.FlightCallback = function()
    {
        that.flystate = false;
        var scene = ogGetScene(m_context);
        var pos = ogWorldToWindow(scene,that.pickPos[4],that.pickPos[5],that.pickPos[6]);
        if(that.posPin != null)
        {
            that.posPin.SetVisible(true);
            that.posPin.SetPos(pos[0], pos[1]);
        }
    };
}
PickingChallenge.prototype = new Challenge(1);
PickingChallenge.prototype.constructor=PickingChallenge;
//-----------------------------------------------------------------------------
/**
 * @description preare this challenge
 */
PickingChallenge.prototype.Prepare = function(delay)
{
    var that = this;
    setTimeout(function()
    {
        that.screenText = new ScreenText(m_ui, that.text,m_centerX, window.innerHeight-255, 26, "center");
        that.pickOverlay = new Kinetic.Rect({
            x: 0,
            y: 0,
            width: window.innerWidth,
            height: window.innerHeight
        });
        that.pickOverlay.on("mousedown", that.OnMouseDown);
        that.pickOverlay.on("mouseup", that.OnMouseUp);
        that.pickOverlay.on("mousemove", that.OnMouseMove);
        m_ui.add(that.pickOverlay);
        that.okayBtn = new Button01(m_ui, "okbtn1", m_centerX-150, window.innerHeight-180, 300, 69, "OK", 15);
        that.resultPin = new Pin(m_ui, m_images["pin_green"], -1, -1);
        that.okayBtn.onClickEvent = that.OnOkay;
        that.okayBtn.onMouseOverEvent = that.MouseOverOkBtn;
        that.okayBtn.onMouseOutEvent = that.MouseOutOkBtn;

        that.clock = new Clock(m_ui, 50, 75, 60);

        var scene = ogGetScene(m_context);
        var camId = ogGetActiveCamera(scene);
        ogSetPosition(camId,8.225578,46.8248707, 280000.0);
        ogSetOrientation(camId,0.0,-90.0, 0.0);

        ogSetInPositionFunction(m_context,that.FlightCallback);
        that.ogFrameLayer = ogAddImageLayer(m_globe, {
            url: [m_datahost],
            layer: "ch_boundaries",
            service: "owg"
        });
    }, delay);
};
//-----------------------------------------------------------------------------
/**
 * @description activate this challenge
 */
PickingChallenge.prototype.Activate = function()
{
    var that = this;
    FadeIn(function() {
        that.clock.onTimeoutEvent = function(){that.callback()};
        that.clock.Start();
    });
};
//-----------------------------------------------------------------------------
/**
 * @description destroy challenge
 */
PickingChallenge.prototype.Destroy = function(event)
{
    if(!this.destroyed)
    {
        this.eventDestroyed = event;
        ogSetInPositionFunction(m_context,function() {});
        this.clock.Pause();
        this.OnDestroy();
        this.destroyed = true;
    }
};
//-----------------------------------------------------------------------------
/**
 * @description on destroy function
 */
PickingChallenge.prototype.OnDestroy = function()
{   this.clock.Destroy();
    var that = this;
    if(!this.draftmode)
    {
        FadeOut(function(){
            that.screenText.Destroy();
            that.resultPin.Destroy();
            if(that.posPin)
            {
                that.posPin.Destroy();
                if(that.distanceLine)
                    m_ui.remove(that.distanceLine);
            }
            that.okayBtn.Destroy();

            m_ui.remove(that.pickOverlay);
            setTimeout(function(){
            ogRemoveImageLayer(that.ogFrameLayer);
            },700);
            that.eventDestroyed();
        });
    } else
    {
        that.screenText.Destroy();
        that.resultPin.Destroy();
        if(that.posPin)
        {
            that.posPin.Destroy();
            if(that.distanceLine)
                m_ui.remove(that.distanceLine);
        }
        that.okayBtn.Destroy();

        m_ui.remove(that.pickOverlay);
        ogRemoveImageLayer(that.ogFrameLayer);
        that.eventDestroyed();
    }
};
//-----------------------------------------------------------------------------
/**
 * @description zoom in map
 * @param {Array.<number>} pos
 * @param {Array.<number>} ori
 */
PickingChallenge.prototype.ZoomIn = function(pos, ori)
{
    this.flystate = true;
    var scene = ogGetScene(m_context);
    ogSetFlightDuration(scene,1000);
    ogFlyToLookAtPosition(scene,pos[1],pos[2], pos[3],20000,0.00,-90.0, 0.0);
};
//-----------------------------------------------------------------------------
/**
 * @description zoom out map
 * @param {Array.<number>} ori reset orientation
 */
PickingChallenge.prototype.ZoomOut = function(ori)
{
    this.flystate = true;
    var scene = ogGetScene(m_context);
    ogSetFlightDuration(scene,800);
    ogFlyTo(scene,8.225578,46.8248707, 280000.0,0.00,-90.0, 0.0);
};

goog.exportSymbol('PickingChallenge', PickingChallenge);
goog.exportProperty(PickingChallenge.prototype, 'Prepare', PickingChallenge.prototype.Prepare);
goog.exportProperty(PickingChallenge.prototype, 'Activate', PickingChallenge.prototype.Activate);
goog.exportProperty(PickingChallenge.prototype, 'Destroy', PickingChallenge.prototype.Destroy);
goog.exportProperty(PickingChallenge.prototype, 'OnDestroy', PickingChallenge.prototype.OnDestroy);
goog.exportProperty(PickingChallenge.prototype, 'ZoomIn', PickingChallenge.prototype.ZoomIn);
goog.exportProperty(PickingChallenge.prototype, 'ZoomOut', PickingChallenge.prototype.ZoomOut);
goog.exportProperty(PickingChallenge.prototype, 'RegisterCallback', PickingChallenge.prototype.RegisterCallback);

