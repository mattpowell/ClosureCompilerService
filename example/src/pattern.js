goog.provide('example.pattern');
goog.require('goog.testing.jsunit');

goog.require('goog.dom.TagWalkType');
goog.require('goog.dom.pattern.AllChildren');
goog.require('goog.dom.pattern.ChildMatches');
goog.require('goog.dom.pattern.EndTag');
goog.require('goog.dom.pattern.FullTag');
goog.require('goog.dom.pattern.MatchType');
goog.require('goog.dom.pattern.NodeType');
goog.require('goog.dom.pattern.Repeat');
goog.require('goog.dom.pattern.Sequence');
goog.require('goog.dom.pattern.StartTag');
goog.require('goog.dom.pattern.Text');


// TODO(robbyw): write a test that checks if backtracking works in Sequence

function testStartTag() {
  var pattern = new goog.dom.pattern.StartTag('DIV');
  assertEquals(
      'StartTag(div) should match div',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'StartTag(div) should not match span',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'StartTag(div) should not match /div',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));
}
window['testStartTag'] = testStartTag;

function testStartTagCase() {
  var pattern = new goog.dom.pattern.StartTag('diV');
  assertEquals(
      'StartTag(diV) should match div',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'StartTag(diV) should not match span',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
}
window['testStartTagCase'] = testStartTagCase;

function testStartTagRegex() {
  var pattern = new goog.dom.pattern.StartTag(/D/);
  assertEquals(
      'StartTag(/D/) should match div',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'StartTag(/D/) should not match span',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'StartTag(/D/) should not match /div',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));
}
window['testStartTagRegex'] = testStartTagRegex;

function testStartTagAttributes() {
  var pattern = new goog.dom.pattern.StartTag('DIV',{id: 'div1'});
  assertEquals(
      'StartTag(div,id:div1) should match div1',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals('StartTag(div,id:div2) should not match div1',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('div2'),
          goog.dom.TagWalkType.START_TAG));
}
window['testStartTagAttributes'] = testStartTagAttributes;

function testStartTagStyle() {
  var pattern = new goog.dom.pattern.StartTag('SPAN',null,{color: 'red'});
  assertEquals(
      'StartTag(span,null,color:red) should match span1',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'StartTag(span,null,color:blue) should not match span1',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('span2'),
          goog.dom.TagWalkType.START_TAG));
}
window['testStartTagStyle'] = testStartTagStyle;

function testStartTagAttributeRegex() {
  var pattern = new goog.dom.pattern.StartTag('SPAN',{id: /span\d/});
  assertEquals(
      'StartTag(span,id:/span\\d/) should match span1',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'StartTag(span,id:/span\\d/) should match span2',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
}
window['testStartTagAttributeRegex'] = testStartTagAttributeRegex;

function testEndTag() {
  var pattern = new goog.dom.pattern.EndTag('DIV');
  assertEquals(
      'EndTag should match div',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));
}
window['testEndTag'] = testEndTag;

function testEndTagRegex() {
  var pattern = new goog.dom.pattern.EndTag(/D/);
  assertEquals(
      'EndTag(/D/) should match /div',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'EndTag(/D/) should not match /span',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'EndTag(/D/) should not match div',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
}
window['testEndTagRegex'] = testEndTagRegex;

function testChildMatches() {
  var pattern = new goog.dom.pattern.ChildMatches(
      new goog.dom.pattern.StartTag('DIV'), 2);

  assertEquals(
      'ChildMatches should match div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'ChildMatches should match /div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'ChildMatches should match div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div2'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'ChildMatches should match /div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div2'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'ChildMatches should finish match at /body',
      goog.dom.pattern.MatchType.BACKTRACK_MATCH,
      pattern.matchToken(
          document.body,
          goog.dom.TagWalkType.END_TAG));

  assertEquals(
      'ChildMatches should match div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div2'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'ChildMatches should match /div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div2'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'ChildMatches should fail to match at /body: not enough child matches',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          document.body,
          goog.dom.TagWalkType.END_TAG));
}
window['testChildMatches'] = testChildMatches;

function testFullTag() {
  var pattern = new goog.dom.pattern.FullTag('DIV');
  assertEquals(
      'FullTag(div) should match div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'FullTag(div) should match /div',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));

  assertEquals(
      'FullTag(div) should start match at div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'FullTag(div) should continue to match span',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'FullTag(div) should continue to match /span',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'FullTag(div) should finish match at /div',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));
}
window['testFullTag'] = testFullTag;

function testAllChildren() {
  var pattern = new goog.dom.pattern.AllChildren();
  assertEquals(
      'AllChildren(div) should match div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'AllChildren(div) should match /div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'AllChildren(div) should match at /body',
      goog.dom.pattern.MatchType.BACKTRACK_MATCH,
      pattern.matchToken(
          document.body,
          goog.dom.TagWalkType.END_TAG));

  assertEquals(
      'AllChildren(div) should start match at div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'AllChildren(div) should continue to match span',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'AllChildren(div) should continue to match /span',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'AllChildren(div) should continue to match at /div',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'AllChildren(div) should finish match at /body',
      goog.dom.pattern.MatchType.BACKTRACK_MATCH,
      pattern.matchToken(
          document.body,
          goog.dom.TagWalkType.END_TAG));
}
window['testAllChildren'] = testAllChildren;

function testText() {
  var pattern = new goog.dom.pattern.Text('Text');
  assertEquals(
      'Text should match div3/text()',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div3').firstChild,
          goog.dom.TagWalkType.OTHER));
  assertEquals(
      'Text should not match div4/text()',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('div4').firstChild,
          goog.dom.TagWalkType.OTHER));
  assertEquals(
      'Text should not match div3',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('div3'),
          goog.dom.TagWalkType.START_TAG));

}
window['testText'] = testText;

function testTextRegex() {
  var pattern = new goog.dom.pattern.Text(/Text/);
  assertEquals(
      'Text(regex) should match div3/text()',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div3').firstChild,
          goog.dom.TagWalkType.OTHER));
  assertEquals(
      'Text(regex) should match div4/text()',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div4').firstChild,
          goog.dom.TagWalkType.OTHER));
}
window['testTextRegex'] = testTextRegex;

function testNodeType() {
  var pattern = new goog.dom.pattern.NodeType(goog.dom.NodeType.COMMENT);
  assertEquals('Comment matcher should match a comment',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('nodeTypes').firstChild,
          goog.dom.TagWalkType.OTHER));
  assertEquals('Comment matcher should not match a text node',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('nodeTypes').lastChild,
          goog.dom.TagWalkType.OTHER));
}
window['testNodeType'] = testNodeType;

function testSequence() {
  var pattern = new goog.dom.pattern.Sequence([
      new goog.dom.pattern.StartTag('DIV'),
      new goog.dom.pattern.StartTag('SPAN'),
      new goog.dom.pattern.EndTag('SPAN'),
      new goog.dom.pattern.EndTag('DIV')]);

  assertEquals(
      'Sequence[0] should match div1',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[1] should match span1',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[2] should match /span1',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'Sequence[3] should match /div1',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));

  assertEquals(
      'Sequence[0] should match div1 again',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[1] should match span1 again',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[2] should match /span1 again',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'Sequence[3] should match /div1 again',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));

  assertEquals(
      'Sequence[0] should match div1',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[1] should not match div1',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));

  assertEquals(
      'Sequence[0] should match div1 after failure',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[1] should match span1 after failure',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[2] should match /span1 after failure',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('span1'),
          goog.dom.TagWalkType.END_TAG));
  assertEquals(
      'Sequence[3] should match /div1 after failure',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('div1'),
          goog.dom.TagWalkType.END_TAG));
}
window['testSequence'] = testSequence;

function testRepeat() {
  var pattern = new goog.dom.pattern.Repeat(
      new goog.dom.pattern.StartTag('B'));

  // Note: this test does not mimic an actual matcher because it is only
  // passing the START_TAG events.

  assertEquals(
      'Repeat[B] should match b1',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('b1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Repeat[B] should match b2',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('b2'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Repeat[B] should backtrack match i1',
      goog.dom.pattern.MatchType.BACKTRACK_MATCH,
      pattern.matchToken(
          goog.dom.getElement('i1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Repeat[B] should have match count of 2',
      2,
      pattern.count);

  assertEquals(
      'Repeat[B] should backtrack match i1 even with no b matches',
      goog.dom.pattern.MatchType.BACKTRACK_MATCH,
      pattern.matchToken(
          goog.dom.getElement('i1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Repeat[B] should have match count of 0',
      0,
      pattern.count);
}
window['testRepeat'] = testRepeat;

function testRepeatWithMinimum() {
  var pattern = new goog.dom.pattern.Repeat(
      new goog.dom.pattern.StartTag('B'), 1);

  // Note: this test does not mimic an actual matcher because it is only
  // passing the START_TAG events.

  assertEquals(
      'Repeat[B,1] should match b1',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('b1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Repeat[B,1] should match b2',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(
          goog.dom.getElement('b2'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Repeat[B,1] should backtrack match i1',
      goog.dom.pattern.MatchType.BACKTRACK_MATCH,
      pattern.matchToken(
          goog.dom.getElement('i1'),
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Repeat[B,1] should have match count of 2',
      2,
      pattern.count);

  assertEquals(
      'Repeat[B,1] should not match i1',
      goog.dom.pattern.MatchType.NO_MATCH,
      pattern.matchToken(
          goog.dom.getElement('i1'),
          goog.dom.TagWalkType.START_TAG));
}
window['testRepeatWithMinimum'] = testRepeatWithMinimum;

function testRepeatWithMaximum() {
  var pattern = new goog.dom.pattern.Repeat(
      new goog.dom.pattern.StartTag('B'), 1, 1);

  // Note: this test does not mimic an actual matcher because it is only
  // passing the START_TAG events.

  assertEquals(
      'Repeat[B,1] should match b1',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(
          goog.dom.getElement('b1'),
          goog.dom.TagWalkType.START_TAG));
}
window['testRepeatWithMaximum'] = testRepeatWithMaximum;

function testSequenceBacktrack() {
  var pattern = new goog.dom.pattern.Sequence([
      new goog.dom.pattern.Repeat(new goog.dom.pattern.StartTag('SPAN')),
      new goog.dom.pattern.Text('X')]);

  var root = goog.dom.getElement('span3');
  assertEquals(
      'Sequence[Repeat[SPAN],"X"] should match span3',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(root, goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[Repeat[SPAN],"X"] should match span3.firstChild',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(root.firstChild,
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[Repeat[SPAN],"X"] should match span3.firstChild.firstChild',
      goog.dom.pattern.MatchType.MATCHING,
      pattern.matchToken(root.firstChild.firstChild,
          goog.dom.TagWalkType.START_TAG));
  assertEquals(
      'Sequence[Repeat[SPAN],"X"] should finish match text node',
      goog.dom.pattern.MatchType.MATCH,
      pattern.matchToken(root.firstChild.firstChild.firstChild,
          goog.dom.TagWalkType.OTHER));
}
window['testSequenceBacktrack'] = testSequenceBacktrack;