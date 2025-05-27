# Run this script from the maven module directory to start a jshell with
# all dependent class paths injected.
# Please never run it on the parent maven project directory.
# It depends on java9 or above
if [ ! -d "target" ]; then
  echo "Please run it under a module directory. And make sure it's not parent module directory. And make a maven install first"
  exit
fi
mvn dependency:build-classpath -DincludeTypes=jar -Dmdep.outputFile=.cp.tmp
jshell --class-path `cat .cp.tmp`:target/classes:target/owlextract-1.0-SNAPSHOT.jar "$@"
